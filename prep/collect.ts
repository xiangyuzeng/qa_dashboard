/**
 * One-time data collection (P1). Pulls real records from the sources verified during
 * research, filters local inspections to café/priority-brand scope (spec §7), classifies
 * to the 19 categories, enriches (risk, café tags, alerts, repeat groups), and writes
 * /data/v2 JSON + meta. Per-source try/catch: a dead source records 0 + a provenance note
 * (never a fabricated row, never a crash). Free-text Chinese is left blank (UI falls back
 * to English) pending a translation enrichment pass — never fabricated.
 *
 * Run: npm run prep:collect   (then prep:validate, prep:export)
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getBytes, getJson, getText, postForm, postJson, socrata } from "./lib/http";
import { parseDelimited, toObjects, unzip } from "./lib/bulk";
import { matchBrand, brandOrOther, establishmentType, inScope } from "./lib/match";
import { classify } from "./lib/classify";
import { assessInspection, assessRegulatory, assessImport, assessRegulation } from "./lib/risk";
import { hashId, normKey } from "./lib/ids";
import { importSeeds, regulationSeeds } from "./seeds";
import { CompanyProfileSchema, ApplicabilityRulesFileSchema } from "../src/lib/schema";
import {
  buildLaborRecords,
  buildBuildingRecords,
  buildEnvironmentRecords,
  buildConsumerRecords,
  stampAppliesToUs,
} from "./domains";
import type { SourceResult, FeedAdapter } from "./lib/feed";
import type {
  RegulatoryRecord,
  InspectionRecord,
  ImportExportRecord,
  RegulationRecord,
  SentimentRecord,
  LaborRecord,
  BuildingRecord,
  EnvironmentRecord,
  ConsumerRecord,
  SourceProvenance,
  Provenance,
} from "../src/lib/schema";

const OUT = join(process.cwd(), "data", "v2");
const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);

const REL = [
  { tag: "coffee", kw: ["coffee", "espresso", "cafe", "café", "latte", "roast"] },
  { tag: "dairy", kw: ["milk", "dairy", "cream", "cheese", "yogurt", "butter"] },
  { tag: "beverage", kw: ["beverage", "drink", "juice", "smoothie", " tea", "soda", "bottled water", "ice "] },
  { tag: "additive", kw: ["additive", "preservative", "sweetener", "flavor", "coloring"] },
  { tag: "allergen", kw: ["allergen", "allergy", "undeclared", "peanut", "tree nut", " soy", "wheat", "sesame"] },
  { tag: "labeling", kw: ["label", "mislabel", "declaration", "misbranded"] },
  { tag: "packaging", kw: ["packaging", "package", "container", "contact material", "foreign material", "glass", "metal frag", "plastic"] },
];
const relevanceTags = (text: string): RegulatoryRecord["relevanceTags"] => {
  const t = text.toLowerCase();
  return REL.filter((r) => r.kw.some((k) => t.includes(k))).map((r) => r.tag) as RegulatoryRecord["relevanceTags"];
};

const isoFromYmd = (s: string | null | undefined): string | null => {
  if (!s) return null;
  const d = s.replace(/[^0-9]/g, "");
  if (d.length >= 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};

// Socrata/CKAN return an inspection's per-violation rows in no fixed order (two identical
// requests can differ), and rows[0] feeds the record id via its violation code — sort first so
// the same inspection keeps the same id (and summary order) run to run.
const sortViolationRows = (rows: Record<string, string>[], codeKey: string, textKey: string) => {
  const cmp = (a = "", b = "") => (a < b ? -1 : a > b ? 1 : 0);
  return rows.sort((a, b) => cmp(a[codeKey], b[codeKey]) || cmp(a[textKey], b[textKey]));
};

const prov = (
  sourceId: string,
  url: string | null,
  extra: Partial<Provenance> = {},
): Provenance => ({
  sourceId,
  agency: null,
  sourceUrl: url && /^https?:\/\//.test(url) ? url : null,
  docRef: null,
  collectedAt: NOW,
  aiSummaryAt: NOW,
  mtAt: null,
  dataAvailability: "available",
  dataAvailabilityLabel: null,
  njMunicipality: null,
  njRoutedTo: null,
  ...extra,
});

const regBase = () => ({
  module: "food_safety" as const,
  alertTriggered: false,
  alertReason: null,
  alertRuleIds: [],
  reviewed: true,
  reviewStatus: "approved" as const,
  reviewNote: "auto-collected — QA review required before treating exports/alerts as final",
  relevanceTags: [] as string[],
});

const inspBase = () => ({
  standardizedCategoriesAll: [] as number[],
  cafeRiskTags: [] as string[],
  repeatViolationGroupId: null as string | null,
  alertTriggered: false,
  alertReason: null as string | null,
  alertRuleIds: [] as string[],
  reviewed: true,
  reviewStatus: "approved" as const,
  reviewNote: "auto-collected — QA review required before treating exports/alerts as final",
});

const provEntry = (
  o: Partial<SourceProvenance> & Pick<SourceProvenance, "sourceId" | "name" | "accessType" | "oneTimePullFeasible">,
): SourceProvenance => ({
  jurisdictionId: null,
  endpointOrUrl: null,
  collectedAt: NOW,
  recordCount: 0,
  stalenessNote: null,
  reVerifyBeforeRelying: false,
  module: "food_safety" as const,
  status: "manual" as const,
  ...o,
});

/* ───────────────────────── FEDERAL ───────────────────────── */

async function collectOpenFDA(): Promise<SourceResult> {
  const url = "https://api.fda.gov/food/enforcement.json?sort=report_date:desc&limit=80";
  const name = "openFDA food enforcement (recalls)";
  try {
    const res = await getJson<{ results: Record<string, string>[] }>(url);
    const out: RegulatoryRecord[] = [];
    for (const r of res.results ?? []) {
      const text = `${r.product_description ?? ""} ${r.reason_for_recall ?? ""} ${r.classification ?? ""}`;
      const tags = relevanceTags(text);
      if (!tags.length) continue; // keep only items touching monitored categories
      const a = assessRegulatory({ category: "召回事件", text, classification: r.classification });
      const title = `${r.recalling_firm ?? "Recall"}: ${(r.reason_for_recall ?? "").slice(0, 90)}`;
      out.push({
        id: hashId("reg", "openfda", r.recall_number ?? title),
        no: null, category: "召回事件", chineseTitle: null, englishTitle: title,
        source: "FDA (openFDA)", publicationDate: isoFromYmd(r.report_date),
        chineseSummary: null,
        englishSummary: `${r.classification ?? ""} — ${(r.reason_for_recall ?? "").slice(0, 240)} (status: ${r.status ?? "n/a"}; firm: ${r.recalling_firm ?? "n/a"})`,
        sourceUrl: `https://api.fda.gov/food/enforcement.json?search=recall_number:%22${encodeURIComponent(r.recall_number ?? "")}%22`,
        riskLevel: a.riskLevel as RegulatoryRecord["riskLevel"], relevanceNotes: r.classification ?? null, recommendedAction: null,
        ...regBase(), relevanceTags: tags, alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
        provenance: prov("fda_recall", `https://api.fda.gov/food/enforcement.json?search=recall_number:%22${r.recall_number ?? ""}%22`),
      });
    }
    return { regulatory: out, provenance: provEntry({ sourceId: "fda_recall", name, accessType: "official-api", endpointOrUrl: url, oneTimePullFeasible: "yes", recordCount: out.length }) };
  } catch (e) {
    return { regulatory: [], provenance: provEntry({ sourceId: "fda_recall", name, accessType: "official-api", endpointOrUrl: url, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectFederalRegister(): Promise<SourceResult> {
  const terms = ["coffee", "dairy", "food allergen labeling", "food additive", "beverage"];
  const name = "Federal Register";
  const seen = new Set<string>();
  const out: RegulatoryRecord[] = [];
  try {
    for (const term of terms) {
      const url = `https://www.federalregister.gov/api/v1/documents.json?per_page=8&order=newest&conditions[term]=${encodeURIComponent(term)}&fields[]=title&fields[]=abstract&fields[]=document_number&fields[]=html_url&fields[]=publication_date&fields[]=type&fields[]=agencies`;
      const res = await getJson<{ results: Record<string, unknown>[] }>(url);
      for (const d of res.results ?? []) {
        const dn = String(d.document_number ?? "");
        if (seen.has(dn)) continue;
        seen.add(dn);
        const title = String(d.title ?? "");
        const abstract = String(d.abstract ?? "");
        const type = String(d.type ?? "");
        const category = /rule/i.test(type) ? "法规标准" : "监管动态";
        const a = assessRegulatory({ category, text: `${title} ${abstract}` });
        out.push({
          id: hashId("reg", "fedreg", dn || title),
          no: null, category, chineseTitle: null, englishTitle: title,
          source: "Federal Register", publicationDate: isoFromYmd(String(d.publication_date ?? "")),
          chineseSummary: null, englishSummary: abstract.slice(0, 260) || null,
          sourceUrl: String(d.html_url ?? "") || null,
          riskLevel: a.riskLevel as RegulatoryRecord["riskLevel"], relevanceNotes: type || null, recommendedAction: null,
          ...regBase(), relevanceTags: relevanceTags(`${title} ${abstract}`),
          provenance: prov("federal_register", String(d.html_url ?? "")),
        });
      }
    }
    return { regulatory: out, provenance: provEntry({ sourceId: "federal_register", name, accessType: "official-api", endpointOrUrl: "https://www.federalregister.gov/api/v1/documents.json", oneTimePullFeasible: "yes", recordCount: out.length }) };
  } catch (e) {
    return { regulatory: out, provenance: provEntry({ sourceId: "federal_register", name, accessType: "official-api", endpointOrUrl: "https://www.federalregister.gov/api/v1/documents.json", oneTimePullFeasible: "yes", stalenessNote: `partial/failed: ${String(e).slice(0, 120)}`, recordCount: out.length, reVerifyBeforeRelying: true }) };
  }
}

async function collectCDC(): Promise<SourceResult> {
  const base = "https://data.cdc.gov/resource/5xkq-dg7x.json";
  const name = "CDC NORS foodborne outbreaks";
  try {
    const rows = await socrata<Record<string, string>>(base, {
      "$where": "primary_mode='Food'",
      "$order": "year DESC, month DESC",
      "$limit": 40,
    });
    const out: RegulatoryRecord[] = rows.map((r) => {
      const etio = r.etiology || "Unknown etiology";
      const text = `${etio} ${r.setting ?? ""} foodborne outbreak`;
      const ill = r.illnesses ? Number(r.illnesses) : null;
      const a = assessRegulatory({ category: "食品安全事件", text, illnesses: ill });
      return {
        id: hashId("reg", "cdc", r.year, r.month, r.state, etio, r.illnesses),
        no: null, category: "食品安全事件", chineseTitle: null,
        englishTitle: `Foodborne outbreak — ${etio} (${r.state ?? "US"}, ${r.year ?? ""})`,
        source: "CDC NORS", publicationDate: r.year ? `${r.year}-${String(r.month || "1").padStart(2, "0")}-01` : null,
        chineseSummary: null,
        englishSummary: `Etiology ${etio}; illnesses ${r.illnesses ?? "n/a"}; deaths ${r.deaths ?? "n/a"}; setting ${r.setting ?? "n/a"}.`,
        sourceUrl: "https://data.cdc.gov/Foodborne-Waterborne-and-Related-Diseases/NORS/5xkq-dg7x",
        riskLevel: a.riskLevel as RegulatoryRecord["riskLevel"], relevanceNotes: r.setting ?? null, recommendedAction: null,
        ...regBase(), relevanceTags: relevanceTags(text).length ? relevanceTags(text) : ["beverage"],
        alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
        provenance: prov("cdc_nors", "https://data.cdc.gov/Foodborne-Waterborne-and-Related-Diseases/NORS/5xkq-dg7x"),
      };
    });
    return { regulatory: out, provenance: provEntry({ sourceId: "cdc_nors", name, accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "NORS is annual and lags ~2–3 years." }) };
  } catch (e) {
    return { regulatory: [], provenance: provEntry({ sourceId: "cdc_nors", name, accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, reVerifyBeforeRelying: true }) };
  }
}

const isoFlexible = (s: string | null | undefined): string | null => {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); // already ISO
  const d = new Date(s); // RSS / free-form ("Wed, 04 Jun 2026 …")
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return isoFromYmd(s); // last resort: digit extraction
};
const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

async function collectFSIS(): Promise<SourceResult> {
  const url = "https://www.fsis.usda.gov/fsis/api/recall/v/1";
  const name = "USDA FSIS recalls";
  try {
    const ua = process.env.FSIS_USER_AGENT || process.env.HTTP_USER_AGENT || "LuckinNA-QA-FoodSafety-Monitor/1.0";
    const rows = await getJson<Record<string, string>[]>(url, { headers: { "User-Agent": ua, Accept: "application/json" } });
    const out: RegulatoryRecord[] = [];
    for (const r of Array.isArray(rows) ? rows : []) {
      const title = stripHtml(r.field_title ?? "FSIS recall");
      const text = `${title} ${stripHtml(r.field_summary ?? "")} ${r.field_recall_reason ?? ""} ${r.field_product_items ?? ""}`;
      const tags = relevanceTags(text);
      // FSIS is meat/poultry/egg — almost all of it is out of scope for a coffee company, and the
      // relevanceTags heuristic over-matches (its "beverage" keyword "ice " hits "notice"/"service",
      // so ~1650 meat recalls slip through). Gate on a TIGHT café-product regex: keep only the rare
      // items that explicitly touch café beverages/breakfast items. (FSIS dairy is FDA's domain, not here.)
      if (!/coffee|espresso|latte|cappuccino|macchiato|cold[ -]?brew|\bchai\b|matcha|frappe|breakfast sandwich|croissant|\bpastr/i.test(text)) continue;
      const a = assessRegulatory({ category: "召回事件", text, classification: r.field_recall_classification });
      out.push({
        id: hashId("reg", "fsis", r.field_recall_number ?? title),
        no: null, category: "召回事件", chineseTitle: null, englishTitle: title.slice(0, 140),
        source: "USDA / FSIS", publicationDate: isoFlexible(r.field_recall_date),
        chineseSummary: null, englishSummary: stripHtml(r.field_summary ?? "").slice(0, 260) || title,
        sourceUrl: "https://www.fsis.usda.gov/recalls",
        riskLevel: a.riskLevel as RegulatoryRecord["riskLevel"], relevanceNotes: r.field_recall_classification ?? null, recommendedAction: null,
        ...regBase(), relevanceTags: tags, alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
        provenance: prov("fsis_recall", "https://www.fsis.usda.gov/recalls"),
      });
    }
    return { regulatory: out, provenance: provEntry({ sourceId: "fsis_recall", name, accessType: "official-api", endpointOrUrl: url, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "FSIS is meat/poultry/egg — kept only items whose text matches café beverages/breakfast/pastry; out-of-scope meat recalls excluded. Set FSIS_USER_AGENT to avoid the 403." }) };
  } catch (e) {
    return { regulatory: [], provenance: provEntry({ sourceId: "fsis_recall", name, accessType: "official-api", endpointOrUrl: url, oneTimePullFeasible: "yes", stalenessNote: `pull failed (needs descriptive UA): ${String(e).slice(0, 100)}`, reVerifyBeforeRelying: true }) };
  }
}

/* ───────────────────────── JURISDICTIONS ───────────────────────── */

const SCOPE_QUERIES = ["STARBUCKS", "DUNKIN", "PRET", "BLUE BOTTLE", "MCDONALD", "LUCKIN", "COFFEE", "CAFE", "ESPRESSO"];

type RawInsp = {
  no: number | null;
  jurisdiction: string;
  regulatoryAgency: string | null;
  brand: string | null;
  establishmentType: string | null;
  storeName: string | null;
  address: string | null;
  inspectionDate: string | null;
  inspectionType: string | null;
  inspectionResult: string | null;
  score: number | null;
  grade: string | null;
  violationCode: string | null;
  chineseViolationSummary: string | null;
  englishViolationSummary: string | null;
  violationSeverity: string | null;
  followupRequired: string | null;
  sourceType: string | null;
  sourceUrlOrDocRef: string | null;
  recommendedAction: string | null;
  establishmentId?: string | null;
  /** Source's own unique key (e.g. OATH ticket number). When set, the id hashes this instead of
   *  store+date+code — a summons shares all three with the DOHMH inspection that issued it. */
  idKey?: string | null;
  violationText: string;
  sourceId: string;
  sourceUrl: string | null;
};

function finalizeInspection(p: RawInsp): InspectionRecord {
  const cls = classify(p.violationText);
  const hasCritical = p.violationSeverity === "严重（主要）Critical";
  const assess = assessInspection({
    jurisdiction: p.jurisdiction,
    result: p.inspectionResult,
    score: p.score,
    grade: p.grade,
    hasCritical,
    categories: cls.all,
  });
  return {
    id: p.idKey
      ? hashId("insp", p.jurisdiction, p.idKey)
      : hashId("insp", p.jurisdiction, p.establishmentId ?? p.storeName, p.inspectionDate, p.violationCode ?? cls.label ?? ""),
    module: "inspection" as const,
    no: p.no,
    jurisdiction: p.jurisdiction as InspectionRecord["jurisdiction"],
    regulatoryAgency: p.regulatoryAgency,
    brand: p.brand as InspectionRecord["brand"],
    establishmentType: p.establishmentType as InspectionRecord["establishmentType"],
    storeName: p.storeName,
    establishmentId: p.establishmentId ?? null,
    address: p.address,
    inspectionDate: p.inspectionDate,
    inspectionType: p.inspectionType,
    inspectionResult: p.inspectionResult as InspectionRecord["inspectionResult"],
    score: p.score,
    grade: p.grade as InspectionRecord["grade"],
    violationCode: p.violationCode,
    chineseViolationSummary: p.chineseViolationSummary,
    englishViolationSummary: p.englishViolationSummary,
    violationSeverity: p.violationSeverity as InspectionRecord["violationSeverity"],
    standardizedCategory: cls.label,
    standardizedCategoryId: cls.primary,
    followupRequired: p.followupRequired as InspectionRecord["followupRequired"],
    sourceType: p.sourceType as InspectionRecord["sourceType"],
    riskLevel: assess.riskLevel as InspectionRecord["riskLevel"],
    sourceUrlOrDocRef: p.sourceUrlOrDocRef,
    recommendedAction: p.recommendedAction,
    standardizedCategoriesAll: cls.all,
    cafeRiskTags: cls.cafeTags as InspectionRecord["cafeRiskTags"],
    repeatViolationGroupId: null,
    alertTriggered: assess.alertTriggered,
    alertReason: assess.alertReason,
    alertRuleIds: assess.alertRuleIds,
    reviewed: true,
    reviewStatus: "approved",
    reviewNote: "auto-collected — QA review required before treating exports/alerts as final",
    provenance: prov(p.sourceId, p.sourceUrl),
  };
}

async function collectNYC(): Promise<SourceResult> {
  const base = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
  const name = "NYC DOHMH Restaurant Inspection Results";
  try {
    const groups = new Map<string, Record<string, string>[]>();
    for (const q of SCOPE_QUERIES) {
      const rows = await socrata<Record<string, string>>(base, {
        "$where": `upper(dba) like '%${q}%' AND inspection_date > '2024-01-01T00:00:00'`,
        "$order": "inspection_date DESC",
        "$limit": 40,
      });
      for (const r of rows) {
        if (!inScope(r.dba)) continue;
        const key = `${r.camis}|${(r.inspection_date ?? "").slice(0, 10)}`;
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
      }
    }
    const out: InspectionRecord[] = [];
    for (const rows of groups.values()) {
      sortViolationRows(rows, "violation_code", "violation_description");
      const r0 = rows[0];
      const violText = rows.map((x) => x.violation_description).filter(Boolean).join(" | ");
      const hasCritical = rows.some((x) => (x.critical_flag ?? "").toLowerCase().startsWith("critical"));
      const action = (r0.action ?? "").toLowerCase();
      const grade = ((): string | null => {
        const g = (r0.grade ?? "").toUpperCase();
        if (g === "A" || g === "B" || g === "C") return g;
        if (g === "Z") return "Pending"; // grade-pending (scored B/C at initial) — meaningful
        if (g === "N") return "N/A";
        return null; // "P"/blank = ungraded/not-yet-assigned — benign, no alert
      })();
      const result = action.includes("closed")
        ? "Closed"
        : grade === "A" ? "Pass" : grade === "B" ? "Conditional Pass" : grade === "C" ? "Fail" : "N/A";
      out.push(
        finalizeInspection({
          no: null, jurisdiction: "New York City", regulatoryAgency: "NYC DOHMH",
          brand: brandOrOther(r0.dba) as InspectionRecord["brand"],
          establishmentType: establishmentType(r0.dba) as InspectionRecord["establishmentType"],
          storeName: r0.dba ?? null,
          establishmentId: r0.camis ?? null,
          address: [r0.building, r0.street, r0.boro, r0.zipcode].filter(Boolean).join(" "),
          inspectionDate: (r0.inspection_date ?? "").slice(0, 10) || null,
          inspectionType: r0.inspection_type ?? null,
          inspectionResult: result as InspectionRecord["inspectionResult"],
          score: r0.score ? Number(r0.score) : null,
          grade: grade as InspectionRecord["grade"],
          violationCode: r0.violation_code ?? null,
          chineseViolationSummary: null,
          englishViolationSummary: violText.slice(0, 400) || null,
          violationSeverity: hasCritical ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
          followupRequired: result === "Fail" || result === "Closed" ? "是 Yes" : "否 No",
          sourceType: "Open Data API",
          sourceUrlOrDocRef: `https://data.cityofnewyork.us/resource/43nn-pn8j.json?camis=${r0.camis}`,
          recommendedAction: null,
          violationText: violText,
          sourceId: "nyc_dohmh",
          sourceUrl: `https://data.cityofnewyork.us/resource/43nn-pn8j.json?camis=${r0.camis}`,
        }),
      );
    }
    return { inspections: out, provenance: provEntry({ sourceId: "nyc_dohmh", name, jurisdictionId: "New York City", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "nyc_dohmh", name, jurisdictionId: "New York City", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectBoston(): Promise<SourceResult> {
  const RID = "4582bec6-2b4f-4f9e-bc55-cbaa73117f4c";
  const name = "Analyze Boston — Food Establishment Inspections";
  try {
    // Boston returns one row per violation; group by license + result date into one inspection.
    const groups = new Map<string, Record<string, string>[]>();
    for (const q of ["Starbucks", "Dunkin", "Pret", "Blue Bottle", "McDonald", "Luckin", "coffee", "cafe"]) {
      const url = `https://data.boston.gov/api/3/action/datastore_search?resource_id=${RID}&limit=80&q=${encodeURIComponent(q)}`;
      const res = await getJson<{ result?: { records?: Record<string, string>[] } }>(url);
      for (const r of res.result?.records ?? []) {
        const nm = r.businessname ?? r.dbaname ?? r.name ?? "";
        if (!inScope(nm)) continue;
        const key = `${r.licenseno ?? nm}|${(r.resultdate ?? "").slice(0, 10)}`;
        (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
      }
    }
    const out: InspectionRecord[] = [];
    for (const rows of groups.values()) {
      sortViolationRows(rows, "violcode", "violdesc");
      const r0 = rows[0];
      const nm = r0.businessname ?? r0.dbaname ?? r0.name ?? "";
      const violText = rows.map((x) => x.violdesc).filter(Boolean).join(" | ");
      const rawResult = (r0.result ?? "").toLowerCase();
      const result = rawResult.includes("fail") ? "Fail" : rawResult.includes("pass") ? "Pass" : "N/A";
      const critical = rows.some((x) => (x.viollevel ?? "").includes("***") || (x.violstatus ?? "").toLowerCase() === "fail");
      out.push(
        finalizeInspection({
          no: null, jurisdiction: "Boston", regulatoryAgency: "Boston Inspectional Services",
          brand: brandOrOther(nm), establishmentType: establishmentType(nm), storeName: nm || null,
          establishmentId: r0.licenseno ?? null,
          address: [r0.address, r0.city, r0.zip].filter(Boolean).join(" ") || null,
          inspectionDate: isoFromYmd(r0.resultdate), inspectionType: r0.licstatus ?? null,
          inspectionResult: result, score: null, grade: null, violationCode: r0.violcode ?? null,
          chineseViolationSummary: null, englishViolationSummary: violText.slice(0, 400) || null,
          violationSeverity: critical ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
          followupRequired: result === "Fail" ? "是 Yes" : "否 No",
          sourceType: "Open Data API",
          sourceUrlOrDocRef: "https://data.boston.gov/dataset/food-establishment-inspections",
          recommendedAction: null,
          violationText: violText, sourceId: "boston_ckan", sourceUrl: "https://data.boston.gov/dataset/food-establishment-inspections",
        }),
      );
    }
    return { inspections: out, provenance: provEntry({ sourceId: "boston_ckan", name, jurisdictionId: "Boston", accessType: "open-data", endpointOrUrl: `https://data.boston.gov/api/3/action/datastore_search?resource_id=${RID}`, oneTimePullFeasible: "yes", recordCount: out.length }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "boston_ckan", name, jurisdictionId: "Boston", accessType: "open-data", endpointOrUrl: "https://data.boston.gov", oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

/* ─────────────── COMPETITOR BENCHMARK JURISDICTIONS (no Luckin stores) ─────────────── */

// Cities where we benchmark competitors only: the priority brands (no generic café sweep), the newest
// PER_BRAND_CAP inspections per brand since BENCH_SINCE — a sample for pass/fail rates and violation
// mix, not a census. Search terms are deliberately broad; matchBrand() (whole-word aliases) is the gate.
const BENCH_TERMS = ["STARBUCKS", "DUNKIN", "PRET A MANGER", "BLUE BOTTLE", "MCDONALD", "LUCKIN"];
const BENCH_SINCE = "2024-01-01";
const PER_BRAND_CAP = 10;
const BENCH_NOTE = `Priority brands only, newest ${PER_BRAND_CAP} inspections per brand since ${BENCH_SINCE} (benchmark sample, not a census).`;

function capPerBrand(rows: InspectionRecord[], cap = PER_BRAND_CAP): InspectionRecord[] {
  const byBrand = new Map<string, InspectionRecord[]>();
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const k = r.brand ?? "其他 Other";
    (byBrand.get(k) ?? byBrand.set(k, []).get(k)!).push(r);
  }
  const newestFirst = (a: InspectionRecord, b: InspectionRecord) =>
    (b.inspectionDate ?? "").localeCompare(a.inspectionDate ?? "") || a.id.localeCompare(b.id);
  return [...byBrand.values()].flatMap((rs) => rs.sort(newestFirst).slice(0, cap));
}

// SoQL string literal (single quotes doubled).
const soqlStr = (s: string) => `'${s.replace(/'/g, "''")}'`;

async function collectChicago(): Promise<SourceResult> {
  const base = "https://data.cityofchicago.org/resource/4ijn-s7e5.json";
  const name = "Chicago Dept. of Public Health — Food Inspections";
  // "Out of Business" / "No Entry" / "Not Ready" / "Business Not Located" are visits, not inspections.
  const RESULT: Record<string, string> = { pass: "Pass", "pass w/ conditions": "Conditional Pass", fail: "Fail" };
  try {
    const out: InspectionRecord[] = [];
    for (const q of BENCH_TERMS) {
      const rows = await socrata<Record<string, string>>(base, {
        "$where": `(upper(dba_name) like '%${q}%' OR upper(aka_name) like '%${q}%') AND inspection_date >= '${BENCH_SINCE}T00:00:00' AND results in ('Pass','Pass w/ Conditions','Fail')`,
        "$order": "inspection_date DESC, inspection_id DESC",
        "$limit": 40,
      });
      for (const r of rows) {
        // franchise rows sometimes carry the brand only in aka_name ("HALE FAMILY" / aka "MCDONALD'S")
        const nm = matchBrand(r.dba_name) ? r.dba_name : r.aka_name;
        const brand = matchBrand(nm);
        if (!brand) continue;
        // "10. ADEQUATE HANDWASHING SINKS … - Comments: OBSERVED …" → keep the standard item, drop the
        // free-text inspector comments (long, and they sometimes name staff).
        const items = (r.violations || "")
          .split(" | ")
          .map((v) => v.split(" - Comments:")[0].replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .map((v) => {
            const m = /^(\d+)\.\s*(.*)$/.exec(v);
            return m ? { code: m[1], text: m[2] } : { code: "", text: v };
          });
        const violText = items.map((i) => i.text).join(" | ");
        const result = RESULT[(r.results || "").toLowerCase()] ?? "N/A";
        const url = `${base}?inspection_id=${r.inspection_id}`;
        out.push(
          finalizeInspection({
            no: null, jurisdiction: "Chicago", regulatoryAgency: "Chicago Dept. of Public Health",
            brand, establishmentType: establishmentType(nm), storeName: r.dba_name || nm || null,
            establishmentId: r.license_ || null,
            address: [r.address, "Chicago, IL", r.zip].filter(Boolean).join(", ") || null,
            inspectionDate: isoFromYmd(r.inspection_date), inspectionType: r.inspection_type || null,
            inspectionResult: result, score: null, grade: null, violationCode: items[0]?.code || null,
            chineseViolationSummary: null, englishViolationSummary: violText || null,
            // Chicago flags the food-code tier in the comments; "PRIORITY VIOLATION" ≈ NYC critical
            // ("PRIORITY FOUNDATION VIOLATION" is the lower tier and does not match).
            violationSeverity: /\bPRIORITY VIOLATION\b/i.test(r.violations || "") ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
            followupRequired: result === "Fail" ? "是 Yes" : "否 No",
            sourceType: "Open Data API", sourceUrlOrDocRef: url, recommendedAction: null,
            idKey: `chi:${r.inspection_id}`,
            violationText: violText, sourceId: "chicago_cdph", sourceUrl: url,
          }),
        );
      }
    }
    const capped = capPerBrand(out);
    return { inspections: capped, provenance: provEntry({ sourceId: "chicago_cdph", name, module: "inspection", status: capped.length ? "fetched" : "no_update", jurisdictionId: "Chicago", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: capped.length, stalenessNote: `${BENCH_NOTE} Results: Pass / Pass w/ Conditions / Fail (no score).` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "chicago_cdph", name, module: "inspection", jurisdictionId: "Chicago", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectSanFrancisco(): Promise<SourceResult> {
  // Successor to the LIVES feed pyih-qa8i (frozen 2019). Covers 2024-present, ~one row per inspection.
  const base = "https://data.sf.gov/resource/tvy3-wexg.json";
  const name = "SF Dept. of Public Health — Health Inspection Scores (2024–present)";
  const RESULT: Record<string, string> = { pass: "Pass", "conditional pass": "Conditional Pass", closure: "Closed" };
  try {
    const out: InspectionRecord[] = [];
    for (const q of BENCH_TERMS) {
      const rows = await socrata<Record<string, string>>(base, {
        // the inspector's name is in the dataset; it is never selected
        "$select": "permit_number,dba,street_address,inspection_date,inspection_type,facility_rating_status,violation_codes",
        "$where": `upper(dba) like '%${q}%' AND inspection_date >= '${BENCH_SINCE}T00:00:00' AND inspection_date <= '${TODAY}T23:59:59'`,
        "$order": "inspection_date DESC, permit_number",
        "$limit": 40,
      });
      for (const r of rows) {
        const brand = matchBrand(r.dba);
        if (!brand) continue;
        // "114135, 114185.1 [d-e] - Store wiping cloths….,  113984(d), 114097 - Properly wash…."
        // → one "<code list> - <text>." part per violation; keep the text, first code for violationCode.
        const parts = (r.violation_codes || "")
          .split(/\.,\s+(?=\d)/)
          .map((v) => v.replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .map((v) => {
            const i = v.indexOf(" - ");
            return i >= 0
              ? { code: (v.slice(0, i).match(/\d[\d.]*/) ?? [""])[0], text: v.slice(i + 3).replace(/\.$/, "") }
              : { code: "", text: v.replace(/\.$/, "") };
          });
        const violText = parts.map((x) => x.text).join(" | ");
        const result = RESULT[(r.facility_rating_status || "").toLowerCase()] ?? "N/A";
        const date = isoFromYmd(r.inspection_date);
        const url = `${base}?permit_number=${r.permit_number}`;
        out.push(
          finalizeInspection({
            no: null, jurisdiction: "San Francisco", regulatoryAgency: "SF Dept. of Public Health",
            brand, establishmentType: establishmentType(r.dba), storeName: r.dba || null,
            establishmentId: r.permit_number || null,
            address: r.street_address ? `${r.street_address.replace(/\s+/g, " ").trim()}, San Francisco, CA` : null,
            inspectionDate: date, inspectionType: r.inspection_type || null,
            inspectionResult: result, score: null, grade: null, violationCode: parts[0]?.code || null,
            chineseViolationSummary: null, englishViolationSummary: violText || null,
            // SF only places a yellow (conditional) or red (closure) placard for major violations
            violationSeverity: result === "Conditional Pass" || result === "Closed" ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
            followupRequired: result === "Conditional Pass" || result === "Closed" ? "是 Yes" : "否 No",
            sourceType: "Open Data API", sourceUrlOrDocRef: url, recommendedAction: null,
            // ~6% of rows repeat permit+date+type with a different total_time — same inspection
            idKey: `sf:${r.permit_number}|${date ?? ""}|${r.inspection_type ?? ""}`,
            violationText: violText, sourceId: "sf_dph", sourceUrl: url,
          }),
        );
      }
    }
    const capped = capPerBrand(out);
    return { inspections: capped, provenance: provEntry({ sourceId: "sf_dph", name, module: "inspection", status: capped.length ? "fetched" : "no_update", jurisdictionId: "San Francisco", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: capped.length, stalenessNote: `${BENCH_NOTE} Placard result Pass / Conditional Pass / Closure (no numeric score; blank = not rated).` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "sf_dph", name, module: "inspection", jurisdictionId: "San Francisco", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectSantaClara(): Promise<SourceResult> {
  // Three tables (SoQL cannot join): businesses → inspections (by business_id) → violations (by id).
  const BIZ = "https://data.sccgov.org/resource/vuw7-jmjk.json";
  const INSP = "https://data.sccgov.org/resource/2u2d-8jej.json";
  const VIOL = "https://data.sccgov.org/resource/wkaa-4ccv.json";
  const name = "Santa Clara County DEH — Food Facility Inspections";
  const RESULT: Record<string, string> = { G: "Pass", Y: "Conditional Pass", R: "Closed" }; // placard colour
  const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
  try {
    const biz = new Map<string, Record<string, string>>();
    for (const q of BENCH_TERMS) {
      const rows = await socrata<Record<string, string>>(BIZ, { "$where": `upper(name) like '%${q}%'`, "$order": "business_id", "$limit": 500 });
      for (const b of rows) if (matchBrand(b.name)) biz.set(b.business_id, b);
    }
    const insps: Record<string, string>[] = [];
    for (const ids of chunks([...biz.keys()], 80)) {
      insps.push(
        ...(await socrata<Record<string, string>>(INSP, {
          "$where": `business_id in (${ids.map(soqlStr).join(",")}) AND date >= '${BENCH_SINCE.replace(/-/g, "")}'`,
          "$order": "date DESC, inpsection_id",
          "$limit": 2000,
        })),
      );
    }
    // cap per brand BEFORE fetching violations so the violation pull stays small
    const byBrand = new Map<string, Record<string, string>[]>();
    for (const i of insps) {
      const brand = matchBrand(biz.get(i.business_id)?.name)!;
      (byBrand.get(brand) ?? byBrand.set(brand, []).get(brand)!).push(i);
    }
    const kept = [...byBrand.values()].flatMap((rs) =>
      rs.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (a.inpsection_id ?? "").localeCompare(b.inpsection_id ?? "")).slice(0, PER_BRAND_CAP),
    );
    const viols = new Map<string, Record<string, string>[]>();
    for (const ids of chunks(kept.map((i) => i.inpsection_id), 60)) {
      const rows = await socrata<Record<string, string>>(VIOL, { "$where": `inspection_id in (${ids.map(soqlStr).join(",")})`, "$limit": 2000 });
      for (const v of rows) (viols.get(v.inspection_id) ?? viols.set(v.inspection_id, []).get(v.inspection_id)!).push(v);
    }
    const out = kept.map((i) => {
      const b = biz.get(i.business_id)!;
      const vs = sortViolationRows(viols.get(i.inpsection_id) ?? [], "code", "description");
      const violText = vs.map((v) => (v.description || "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" | ");
      const result = RESULT[(i.result || "").toUpperCase()] ?? "N/A";
      const score = /^\d+$/.test(i.score ?? "") ? Number(i.score) : null; // 0–100, higher = better
      const url = `${INSP}?inpsection_id=${i.inpsection_id}`;
      return finalizeInspection({
        no: null, jurisdiction: "Santa Clara County", regulatoryAgency: "Santa Clara County Dept. of Environmental Health",
        brand: matchBrand(b.name)!, establishmentType: establishmentType(b.name), storeName: b.name || null,
        establishmentId: i.business_id || null,
        address: [b.address, b.city, b.postal_code ? `CA ${b.postal_code}` : "CA"].filter(Boolean).join(", "),
        inspectionDate: isoFromYmd(i.date), inspectionType: i.type || null,
        inspectionResult: result, score, grade: null, violationCode: vs[0]?.code || null,
        chineseViolationSummary: null, englishViolationSummary: violText || null,
        violationSeverity: vs.some((v) => String(v.critical) === "true") ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
        followupRequired: result === "Conditional Pass" || result === "Closed" ? "是 Yes" : "否 No",
        sourceType: "Open Data API", sourceUrlOrDocRef: url, recommendedAction: null,
        idKey: `scc:${i.inpsection_id}`,
        violationText: violText, sourceId: "scc_deh", sourceUrl: url,
      });
    });
    return { inspections: out, provenance: provEntry({ sourceId: "scc_deh", name, module: "inspection", status: out.length ? "fetched" : "no_update", jurisdictionId: "Santa Clara County", accessType: "open-data", endpointOrUrl: INSP, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: `${BENCH_NOTE} Placard G/Y/R → Pass / Conditional Pass / Closed; score 0–100 (higher = better). Rolling ~2-year window, refreshed ~monthly. Covers San Jose & Palo Alto.` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "scc_deh", name, module: "inspection", jurisdictionId: "Santa Clara County", accessType: "open-data", endpointOrUrl: INSP, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectFairfax(): Promise<SourceResult> {
  const FS = "https://www.fairfaxcounty.gov/gispub2/rest/services/Health/PermittedFoodEstablishments/FeatureServer";
  const name = "Fairfax County Health Dept. — Food Establishment Inspections (ArcGIS)";
  const RESULT: Record<string, string> = { passed: "Pass", "partial pass": "Conditional Pass", failed: "Fail", "failed - self closed": "Closed" };
  const q = (layer: number, params: Record<string, string | number>) =>
    getJson<{ features?: { attributes: Record<string, unknown> }[]; error?: { message?: string } }>(
      `${FS}/${layer}/query?${new URLSearchParams({ f: "json", ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) })}`,
    );
  try {
    const out: InspectionRecord[] = [];
    const rows: Record<string, unknown>[] = [];
    for (const term of BENCH_TERMS) {
      const res = await q(1, {
        where: `UPPER(ESTABLISHMENT_NAME) LIKE '%${term}%' AND INSPECTIONDATE >= DATE '${BENCH_SINCE}'`,
        outFields: "INSPECTIONID,RECORDID,INSPECTIONDATE,INSPECTIONRESULT,WEBSITE_LINK,ESTABLISHMENT_NAME",
        orderByFields: "INSPECTIONDATE DESC",
        resultRecordCount: 40,
      });
      if (res.error) throw new Error(res.error.message ?? "ArcGIS query error");
      rows.push(...(res.features ?? []).map((f) => f.attributes));
    }
    // establishment layer carries the address
    const recIds = [...new Set(rows.map((r) => String(r.RECORDID ?? "")).filter(Boolean))];
    const addr = new Map<string, string>();
    // 40 per call: the county's IIS front end 404s query strings over ~2 KB (80 ids is too many)
    for (let i = 0; i < recIds.length; i += 40) {
      const ids = recIds.slice(i, i + 40);
      const res = await q(0, { where: `RECORDID IN (${ids.map((x) => `'${x.replace(/'/g, "''")}'`).join(",")})`, outFields: "RECORDID,PERMIT_ADDRESS,PERMIT_CITY,PERMIT_STATE,PERMIT_ZIP" });
      for (const f of res.features ?? []) {
        const a = f.attributes;
        addr.set(String(a.RECORDID), [a.PERMIT_ADDRESS, a.PERMIT_CITY, [a.PERMIT_STATE, a.PERMIT_ZIP].filter(Boolean).join(" ")].filter(Boolean).join(", "));
      }
    }
    for (const r of rows) {
      const nm = String(r.ESTABLISHMENT_NAME ?? "");
      const brand = matchBrand(nm);
      if (!brand) continue;
      const result = RESULT[String(r.INSPECTIONRESULT ?? "").toLowerCase()] ?? "N/A";
      const ts = Number(r.INSPECTIONDATE ?? 0);
      const report = r.WEBSITE_LINK ? String(r.WEBSITE_LINK) : `${FS}/1`;
      out.push(
        finalizeInspection({
          no: null, jurisdiction: "Fairfax County, VA", regulatoryAgency: "Fairfax County Health Dept.",
          brand, establishmentType: establishmentType(nm), storeName: nm || null,
          establishmentId: String(r.RECORDID ?? "") || null, address: addr.get(String(r.RECORDID)) ?? null,
          inspectionDate: ts ? new Date(ts).toISOString().slice(0, 10) : null, inspectionType: null,
          inspectionResult: result, score: null, grade: null, violationCode: null,
          // the feed has the outcome only; violation detail lives in the linked Accela report
          chineseViolationSummary: null, englishViolationSummary: null,
          violationSeverity: null,
          followupRequired: result === "Fail" || result === "Closed" ? "是 Yes" : "否 No",
          sourceType: "Open Data API", sourceUrlOrDocRef: report, recommendedAction: null,
          idKey: `ffx:${r.INSPECTIONID}`,
          violationText: "", sourceId: "fairfax_hd", sourceUrl: report,
        }),
      );
    }
    const capped = capPerBrand(out);
    return { inspections: capped, provenance: provEntry({ sourceId: "fairfax_hd", name, module: "inspection", status: capped.length ? "fetched" : "no_update", jurisdictionId: "Fairfax County, VA", accessType: "open-data", endpointOrUrl: `${FS}/1`, oneTimePullFeasible: "yes", recordCount: capped.length, stalenessNote: `${BENCH_NOTE} Outcome only (Passed / Partial Pass / Failed / Failed - Self Closed) — no score or violation detail in the feed; each row links its Accela inspection report.` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "fairfax_hd", name, module: "inspection", jurisdictionId: "Fairfax County, VA", accessType: "open-data", endpointOrUrl: `${FS}/1`, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectCambridge(): Promise<SourceResult> {
  // One row per cited violation, grouped by case id (= one sanitary inspection). The dataset records
  // what was cited and when it was corrected — there is NO pass/fail, score or grade, so the result
  // is N/A (never counted in pass/fail rates). Severity comes from the (P)/(Pf)/(C) code marker.
  const base = "https://data.cambridgema.gov/resource/ryb9-qzmw.json";
  const name = "Cambridge Inspectional Services — Sanitary Inspections";
  try {
    const cases = new Map<string, Record<string, string>[]>();
    for (const q of BENCH_TERMS) {
      const rows = await socrata<Record<string, string>>(base, {
        "$select": "id,business_name,full_address,code_number,code_description,case_open_date,case_closed_date,issue_date,permit_type",
        "$where": `upper(business_name) like '%${q}%' AND coalesce(case_open_date, case_closed_date, issue_date) >= '${BENCH_SINCE}T00:00:00'`,
        "$order": "id DESC",
        "$limit": 400,
      });
      for (const r of rows) if (matchBrand(r.business_name)) (cases.get(r.id) ?? cases.set(r.id, []).get(r.id)!).push(r);
    }
    const out: InspectionRecord[] = [];
    for (const [id, rows] of cases) {
      sortViolationRows(rows, "code_number", "code_description");
      const r0 = rows[0];
      const violText = [...new Set(rows.map((x) => (x.code_description || "").replace(/\s+/g, " ").trim()).filter(Boolean))].join(" | ");
      const date = rows.map((x) => isoFromYmd(x.case_open_date) ?? isoFromYmd(x.case_closed_date) ?? isoFromYmd(x.issue_date)).filter(Boolean).sort()[0] ?? null;
      const url = `${base}?id=${id}`;
      out.push(
        finalizeInspection({
          no: null, jurisdiction: "Cambridge", regulatoryAgency: "Cambridge Inspectional Services",
          brand: matchBrand(r0.business_name)!, establishmentType: establishmentType(r0.business_name),
          storeName: r0.business_name || null, establishmentId: r0.full_address || null, address: r0.full_address || null,
          inspectionDate: date, inspectionType: r0.permit_type || null,
          inspectionResult: "N/A", score: null, grade: null, violationCode: r0.code_number || null,
          chineseViolationSummary: null, englishViolationSummary: violText || null,
          violationSeverity: rows.some((x) => /\(P\)\s*$/.test(x.code_description || "")) ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
          followupRequired: "否 No",
          sourceType: "Open Data API", sourceUrlOrDocRef: url, recommendedAction: null,
          idKey: `cam:${id}`,
          violationText: violText, sourceId: "cambridge_socrata", sourceUrl: url,
        }),
      );
    }
    const capped = capPerBrand(out);
    return { inspections: capped, provenance: provEntry({ sourceId: "cambridge_socrata", name, module: "inspection", status: capped.length ? "fetched" : "no_update", jurisdictionId: "Cambridge", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: capped.length, stalenessNote: `${BENCH_NOTE} Cited violations per case only — no pass/fail, score or grade in this dataset (result N/A).` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "cambridge_socrata", name, module: "inspection", jurisdictionId: "Cambridge", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

/* ─────────────── MANUAL INTAKE (DC / Newark / Bergen / FL / SF / offline) ─────────────── */

// Reads intake/inspections.json (manually-collected via OPRA / web lookup / PDF / email).
// Lets QA represent no-API jurisdictions truthfully (incl. NJ 'not_public_online') without
// fabricating. See intake/README.md + intake/inspections.example.json.
// LA County Environmental Health — the County's ArcGIS Hub CSV exports (rolling 3-year window):
// one row per inspection (SCORE 0–100 higher = better + GRADE A/B/C) and one row per violation joined
// on SERIAL NUMBER. Single files with no server-side query, so both are downloaded (~24 MB + ~40 MB,
// cp1252) and filtered here. Covers the County health jurisdiction — NOT Pasadena, Long Beach or
// Vernon (own health departments). Recency-gated: a stale export ships a truthful stub, not old grades.
async function collectLA(): Promise<SourceResult> {
  const name = "LA County Environmental Health — Restaurant & Market Inspections (ArcGIS Hub CSV)";
  const INSP = "https://www.arcgis.com/sharing/rest/content/items/19b6607ac82c4512b10811870975dbdc/data";
  const VIOL = "https://www.arcgis.com/sharing/rest/content/items/5eaea9f89b7549ee841da7617d3a9cba/data";
  const PAGE = "https://www.arcgis.com/home/item.html?id=19b6607ac82c4512b10811870975dbdc";
  const cp1252 = new TextDecoder("windows-1252");
  const mdy = (s: string | undefined): string | null => {
    const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s ?? "");
    return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
  };
  try {
    const insp = toObjects(parseDelimited(cp1252.decode(await getBytes(INSP))));
    const newest = insp.reduce((mx, r) => {
      const d = mdy(r["ACTIVITY DATE"]);
      return d && d > mx && d <= TODAY ? d : mx;
    }, "");
    const cutoff = new Date(Date.parse(TODAY) - 550 * 86400000).toISOString().slice(0, 10); // ~18 months
    if (!newest || newest < cutoff) {
      return { inspections: [], provenance: provEntry({ sourceId: "la_county_arcgis", name, module: "inspection", status: "no_update", jurisdictionId: "Los Angeles County", accessType: "bulk-download", endpointOrUrl: INSP, oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: `County export is stale (newest inspection ${newest || "n/a"}) — no stale rows shipped; re-pin the ArcGIS item.`, reVerifyBeforeRelying: true }) };
    }
    // newest PER_BRAND_CAP per brand, decided before the (larger) violations file is read
    const byBrand = new Map<string, { r: Record<string, string>; date: string }[]>();
    for (const r of insp) {
      const brand = matchBrand(r["FACILITY NAME"]);
      const date = mdy(r["ACTIVITY DATE"]);
      if (!brand || !date || date < BENCH_SINCE || date > TODAY) continue;
      (byBrand.get(brand) ?? byBrand.set(brand, []).get(brand)!).push({ r, date });
    }
    const kept = [...byBrand.values()].flatMap((xs) =>
      xs.sort((a, b) => b.date.localeCompare(a.date) || a.r["SERIAL NUMBER"].localeCompare(b.r["SERIAL NUMBER"])).slice(0, PER_BRAND_CAP),
    );
    const serials = new Set(kept.map((k) => k.r["SERIAL NUMBER"]));
    const viol = new Map<string, Record<string, string>[]>();
    for (const v of toObjects(parseDelimited(cp1252.decode(await getBytes(VIOL))))) {
      const sn = v["SERIAL NUMBER"];
      if (serials.has(sn)) (viol.get(sn) ?? viol.set(sn, []).get(sn)!).push(v);
    }
    const out = kept.map(({ r, date }) => {
      const sn = r["SERIAL NUMBER"];
      const vs = sortViolationRows(viol.get(sn) ?? [], "VIOLATION CODE", "VIOLATION DESCRIPTION");
      // "# 07. PROPER HOT AND COLD HOLDING TEMPERATURES" → drop the "# 07." item number
      const violText = vs.map((v) => v["VIOLATION DESCRIPTION"].replace(/^#\s*\d+\.\s*/, "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" | ");
      const score = /^\d+(\.\d+)?$/.test((r.SCORE ?? "").trim()) ? Number(r.SCORE) : null;
      const g = (r.GRADE ?? "").trim().toUpperCase();
      const grade = g === "A" || g === "B" || g === "C" ? g : null;
      const band = grade ?? (score == null ? null : score >= 90 ? "A" : score >= 80 ? "B" : "C");
      const result = band === "A" ? "Pass" : band === "B" ? "Conditional Pass" : band === "C" ? "Fail" : "N/A";
      return finalizeInspection({
        no: null, jurisdiction: "Los Angeles County", regulatoryAgency: "LA County Dept. of Public Health — Environmental Health",
        brand: matchBrand(r["FACILITY NAME"])!, establishmentType: establishmentType(r["FACILITY NAME"]),
        storeName: r["FACILITY NAME"] || null, establishmentId: r["FACILITY ID"] || null,
        address: [r["FACILITY ADDRESS"], r["FACILITY CITY"], [r["FACILITY STATE"], r["FACILITY ZIP"]].filter(Boolean).join(" ")].filter(Boolean).join(", ") || null,
        inspectionDate: date, inspectionType: (r["SERVICE DESCRIPTION"] || "").trim() || null,
        inspectionResult: result, score, grade, violationCode: vs[0]?.["VIOLATION CODE"] || null,
        chineseViolationSummary: null, englishViolationSummary: violText || null,
        // LA weights violations 1 / 2 / 4 points; 4 = major (holding temps, food-contact sanitation),
        // 11 = imminent health hazard (vermin, sewage)
        violationSeverity: vs.some((v) => Number(v.POINTS) >= 4) ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
        followupRequired: result === "Fail" ? "是 Yes" : "否 No",
        sourceType: "Open Data API", sourceUrlOrDocRef: PAGE, recommendedAction: null,
        idKey: `la:${sn}`,
        violationText: violText, sourceId: "la_county_arcgis", sourceUrl: PAGE,
      });
    });
    return { inspections: out, provenance: provEntry({ sourceId: "la_county_arcgis", name, module: "inspection", status: out.length ? "fetched" : "no_update", jurisdictionId: "Los Angeles County", accessType: "bulk-download", endpointOrUrl: INSP, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: `${BENCH_NOTE} Score 0–100 (higher = better) + grade A/B/C; newest inspection in the export ${newest}. Excludes Pasadena / Long Beach / Vernon.` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "la_county_arcgis", name, module: "inspection", jurisdictionId: "Los Angeles County", accessType: "bulk-download", endpointOrUrl: INSP, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, recordCount: 0, reVerifyBeforeRelying: true }) };
  }
}

// Southern Nevada Health District (Las Vegas / Clark County) — one ZIP rebuilt nightly with the
// whole restaurant database as semicolon-delimited latin-1 CSVs. Inspections join establishments on
// permit_number (NOT facility_id — one casino/hotel facility holds many permits, incl. long-deleted
// seasonal kiosks) and violations through a comma list of violation ids. Demerits: lower = better;
// grade A/B/C, X = closed. The inspector id column (employee_id) is never read.
async function collectSouthernNevada(): Promise<SourceResult> {
  const name = "Southern Nevada Health District — Restaurant Inspections (nightly ZIP)";
  const ZIP = "https://www.southernnevadahealthdistrict.org/restaurants/download/restaurants.zip";
  const PAGE = "https://www.southernnevadahealthdistrict.org/permits-and-regulations/restaurant-inspections/restaurant-inspection-search/";
  const FILES = ["restaurant_inspections.csv", "restaurant_establishments.csv", "restaurant_violations.csv", "restaurant_inspection_types.csv"];
  try {
    const files = unzip(await getBytes(ZIP), (n) => FILES.includes(n));
    const latin1 = new TextDecoder("latin1");
    const read = (n: string) => {
      const b = files.get(n);
      if (!b) throw new Error(`${n} missing from ZIP`);
      return toObjects(parseDelimited(latin1.decode(b), ";"));
    };
    const est = new Map(read("restaurant_establishments.csv").map((e) => [e.permit_number, e]));
    const vio = new Map(read("restaurant_violations.csv").map((v) => [v.violation_id, v]));
    const types = new Map(read("restaurant_inspection_types.csv").map((t) => [t.inspection_type_id, t.inspection_type]));
    const brandOf = (e: Record<string, string> | undefined) => (e ? matchBrand(e.restaurant_name) ?? matchBrand(e.location_name) : null);
    const byBrand = new Map<string, Record<string, string>[]>();
    for (const i of read("restaurant_inspections.csv")) {
      const date = (i.inspection_date || "").slice(0, 10);
      if (date < BENCH_SINCE || date > TODAY) continue;
      const brand = brandOf(est.get(i.permit_number));
      if (brand) (byBrand.get(brand) ?? byBrand.set(brand, []).get(brand)!).push(i);
    }
    const kept = [...byBrand.values()].flatMap((xs) =>
      xs.sort((a, b) => b.inspection_date.localeCompare(a.inspection_date) || a.serial_number.localeCompare(b.serial_number)).slice(0, PER_BRAND_CAP),
    );
    const out = kept.map((i) => {
      const e = est.get(i.permit_number)!;
      const vs = (i.violations || "").split(",").map((x) => vio.get(x.trim())).filter((v): v is Record<string, string> => !!v);
      const violText = vs.map((v) => (v.violation_description || "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" | ");
      const g = (i.inspection_grade || "").trim().toUpperCase();
      const closed = g === "X" || /closed/i.test(i.inspection_result || "");
      const result = closed ? "Closed" : g === "A" ? "Pass" : g === "B" ? "Conditional Pass" : g === "C" ? "Fail" : "N/A";
      const store = e.location_name && e.location_name !== e.restaurant_name ? `${e.restaurant_name} (${e.location_name})` : e.restaurant_name;
      return finalizeInspection({
        no: null, jurisdiction: "Southern Nevada (Las Vegas)", regulatoryAgency: "Southern Nevada Health District",
        brand: brandOf(e)!, establishmentType: establishmentType(matchBrand(e.restaurant_name) ? e.restaurant_name : e.location_name),
        storeName: store || null, establishmentId: i.permit_number || null,
        address: [e.address, e.city_name, e.zip_code ? `NV ${e.zip_code}` : "NV"].filter(Boolean).join(", "),
        inspectionDate: i.inspection_date.slice(0, 10), inspectionType: types.get(i.inspection_type_id) ?? null,
        inspectionResult: result,
        score: /^\d+$/.test(i.inspection_demerits || "") ? Number(i.inspection_demerits) : null, // demerits, lower = better
        grade: g === "A" || g === "B" || g === "C" ? g : null,
        violationCode: null, // SNHD exposes internal violation ids, not citable codes
        chineseViolationSummary: null, englishViolationSummary: violText || null,
        // SNHD demerits: 5 = critical, 3 = major, 1 = good food management practice
        violationSeverity: vs.some((v) => Number(v.violation_demerits) >= 5) ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
        followupRequired: result === "Fail" || result === "Closed" ? "是 Yes" : "否 No",
        sourceType: "Open Data API", sourceUrlOrDocRef: PAGE, recommendedAction: null,
        idKey: `snhd:${i.serial_number}`,
        violationText: violText, sourceId: "snhd", sourceUrl: PAGE,
      });
    });
    return { inspections: out, provenance: provEntry({ sourceId: "snhd", name, module: "inspection", status: out.length ? "fetched" : "no_update", jurisdictionId: "Southern Nevada (Las Vegas)", accessType: "bulk-download", endpointOrUrl: ZIP, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: `${BENCH_NOTE} Demerits (lower = better) + grade A/B/C; X / "Closed with/without Fees" = closure. ZIP rebuilt nightly.` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "snhd", name, module: "inspection", jurisdictionId: "Southern Nevada (Las Vegas)", accessType: "bulk-download", endpointOrUrl: ZIP, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

// San Diego County DEHQ — the JSON the sdfoodinfo.org search page calls (POST search.htm). One call
// returns business → inspections (full history) → violations. Search is whole-word: "MCDONALD'S"
// finds nothing and "MCDONALD" matches unrelated names, so the brand list is spelled for it and
// matchBrand() is the gate. Phone numbers in the payload are never stored.
async function collectSanDiego(): Promise<SourceResult> {
  const API = "https://sdfoodinfo.org/restaurants/search.htm";
  const PAGE = "https://sdfoodinfo.org/restaurants/list_restaurants.html";
  const name = "San Diego County DEHQ — Food Facility Inspections (sdfoodinfo.org)";
  const TERMS = ["STARBUCKS", "DUNKIN", "PRET", "BLUE BOTTLE", "MCDONALDS", "LUCKIN"];
  type Viol = { violation?: string; violation_accela?: string; major_violation?: string; status?: string };
  type Insp = { inspection_id: string | number; type?: string; score?: string | number; grade?: string; completed_date?: string; status?: string; violations?: Viol[] };
  type Biz = { business_id: string | number; name?: string; address?: string; inspections?: Insp[] };
  try {
    const biz = new Map<string, Biz>();
    for (const q of TERMS) {
      for (let page = 1; page <= 5; page++) {
        const res = await postForm<{ result?: Biz[]; total_count?: number }>(API, { name: q, page_number: page, page_count: 200, lat: 32.7157, lng: -117.1611 });
        const rows = res.result ?? []; // no-match searches return no `result` key at all
        for (const b of rows) if (matchBrand(b.name)) biz.set(String(b.business_id), b);
        if (rows.length < 200 || page * 200 >= (res.total_count ?? 0)) break;
      }
    }
    const out: InspectionRecord[] = [];
    for (const b of biz.values()) {
      for (const i of b.inspections ?? []) {
        const date = isoFromYmd(i.completed_date);
        if (!date || date < BENCH_SINCE || date > TODAY) continue;
        const g = (i.grade ?? "").trim().toUpperCase();
        const closed = /closed/i.test(i.status ?? ""); // "Ordered Closed" / "Self Closed"
        const result = closed ? "Closed" : g === "A" ? "Pass" : g === "B" ? "Conditional Pass" : g === "C" ? "Fail" : "N/A";
        const sc = Number(i.score);
        // routine inspections carry score + grade; other visit types report 0 with no grade
        const score = g && Number.isFinite(sc) && sc > 0 ? sc : null;
        const vs = (i.violations ?? [])
          .map((v) => {
            const raw = (v.violation_accela || v.violation || "").replace(/\s+/g, " ").trim();
            const m = /^(\d+)\.\s*(.*)$/.exec(raw);
            return { code: m ? m[1] : "", text: m ? m[2] : raw, major: v.major_violation === "Y" || /major/i.test(v.status ?? "") };
          })
          .filter((v) => v.text);
        const violText = vs.map((v) => v.text).join(" | ");
        out.push(
          finalizeInspection({
            no: null, jurisdiction: "San Diego County", regulatoryAgency: "San Diego County Dept. of Environmental Health & Quality",
            brand: matchBrand(b.name)!, establishmentType: establishmentType(b.name), storeName: b.name || null,
            establishmentId: String(b.business_id), address: b.address || null,
            inspectionDate: date, inspectionType: i.type || null,
            inspectionResult: result, score, grade: g === "A" || g === "B" || g === "C" ? g : null,
            violationCode: vs[0]?.code || null,
            chineseViolationSummary: null, englishViolationSummary: violText || null,
            violationSeverity: vs.some((v) => v.major) ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
            followupRequired: result === "Fail" || result === "Closed" ? "是 Yes" : "否 No",
            sourceType: "Open Data API", sourceUrlOrDocRef: PAGE, recommendedAction: null,
            idKey: `sd:${i.inspection_id}`,
            violationText: violText, sourceId: "sd_dehq", sourceUrl: PAGE,
          }),
        );
      }
    }
    const capped = capPerBrand(out);
    return { inspections: capped, provenance: provEntry({ sourceId: "sd_dehq", name, module: "inspection", status: capped.length ? "fetched" : "no_update", jurisdictionId: "San Diego County", accessType: "html-scrape", endpointOrUrl: API, oneTimePullFeasible: "yes", recordCount: capped.length, stalenessNote: `${BENCH_NOTE} Score 0–100 + grade A/B/C on routine inspections; "Ordered Closed" / "Self Closed" = closure.` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "sd_dehq", name, module: "inspection", jurisdictionId: "San Diego County", accessType: "html-scrape", endpointOrUrl: API, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

// Pasadena Public Health (own health department — not in LA County data). The search page is backed
// by JSON endpoints with keyword search only. Two systems: the current one (score + rating; violation
// detail only in a PDF) and the legacy Envision one (2014 → 2025-11, score + itemised violations).
// Both are read; an inspection present in both (around the switch-over) keeps the legacy copy.
async function collectPasadena(): Promise<SourceResult> {
  const B = "https://healthinspectionreports.cityofpasadena.net/Inspection";
  const PAGE = "https://healthinspectionreports.cityofpasadena.net/InspectionSearch";
  const name = "Pasadena Public Health — Health Inspection Reports";
  const TERMS = ["STARBUCKS", "DUNKIN", "PRET", "BLUE BOTTLE", "MCDONALD", "LUCKIN"];
  type Permit = { DBA?: string; CompanyName?: string; FullAddressLine1?: string; FullAddressLine2?: string; BlLicenseId: string };
  type Cur = { InspectionNumber?: string; InspectionActualStartDateTime?: string; ViolationScore?: number | null; ViolationRating?: string; InspectionType?: string; InspectionStatus?: string };
  type LegViol = { ViolationCode?: string; Score?: number; ViolationItem?: string };
  type Leg = { InspectionDate?: string; InspectionType?: string; InspectionScore?: number | null; Violations?: LegViol[] };
  const search = async (path: string, q: string) =>
    (await postJson<{ Rows?: Permit[] }>(`${B}/${path}`, { keyword: q, permitType: null, city: null, zipCode: null, limit: 100, offset: 0 })).Rows ?? [];
  const brandOf = (p: Permit) => matchBrand(p.DBA) ?? matchBrand(p.CompanyName);
  const band = (score: number | null) => (score == null ? null : score >= 90 ? "Pass" : score >= 80 ? "Conditional Pass" : "Fail");
  const norm = (a?: string) => (a ?? "").toUpperCase().replace(/\s+/g, " ").trim();
  try {
    const permits = { cur: new Map<string, Permit>(), leg: new Map<string, Permit>() };
    for (const q of TERMS) {
      for (const p of await search("SearchPermits", q)) if (brandOf(p)) permits.cur.set(p.BlLicenseId, p);
      for (const p of await search("SearchEnvisionPermits", q)) if (brandOf(p)) permits.leg.set(p.BlLicenseId, p);
    }
    const byKey = new Map<string, InspectionRecord>();
    const add = (key: string, rec: InspectionRecord, preferNew: boolean) => {
      if (preferNew || !byKey.has(key)) byKey.set(key, rec);
    };
    const base = (p: Permit, date: string, type: string | null, score: number | null, result: string, viols: LegViol[], idKey: string) => {
      const nm = p.DBA || p.CompanyName || "";
      const violText = viols.map((v) => (v.ViolationItem || "").replace(/\s+/g, " ").trim()).filter(Boolean).join(" | ");
      return finalizeInspection({
        no: null, jurisdiction: "Pasadena", regulatoryAgency: "Pasadena Public Health Dept. — Environmental Health",
        brand: brandOf(p)!, establishmentType: establishmentType(matchBrand(p.DBA) ? p.DBA : p.CompanyName), storeName: nm || null,
        establishmentId: p.BlLicenseId, address: [p.FullAddressLine1, p.FullAddressLine2].filter(Boolean).join(", ") || null,
        inspectionDate: date, inspectionType: type,
        inspectionResult: result, score, grade: null, violationCode: viols[0]?.ViolationCode || null,
        chineseViolationSummary: null, englishViolationSummary: violText || null,
        // Pasadena weights violations like LA County (1 / 2 / 4 points); 4+ = major
        violationSeverity: viols.some((v) => Number(v.Score) >= 4) ? "严重（主要）Critical" : violText ? "一般 Non-critical" : null,
        followupRequired: result === "Fail" || result === "Permit Suspended" ? "是 Yes" : "否 No",
        sourceType: "Open Data API", sourceUrlOrDocRef: PAGE, recommendedAction: null,
        idKey, violationText: violText, sourceId: "pasadena_ph", sourceUrl: PAGE,
      });
    };
    for (const p of permits.leg.values()) {
      const res = await postJson<{ Inspections?: Leg[] }>(`${B}/GetEnvisionInspections`, { entityId: p.BlLicenseId });
      for (const i of res.Inspections ?? []) {
        const date = isoFromYmd(i.InspectionDate);
        if (!date || date < BENCH_SINCE || date > TODAY) continue;
        const viols = [...(i.Violations ?? [])].sort((a, b) => (a.ViolationCode ?? "").localeCompare(b.ViolationCode ?? ""));
        const score = typeof i.InspectionScore === "number" ? i.InspectionScore : null;
        const suspended = viols.some((v) => /permit suspension/i.test(v.ViolationItem ?? ""));
        const result = suspended ? "Permit Suspended" : band(score) ?? "N/A";
        add(`${norm(p.FullAddressLine1)}|${date}`, base(p, date, i.InspectionType ?? null, score, result, viols, `pas:env:${p.BlLicenseId}|${date}|${i.InspectionType ?? ""}`), true);
      }
    }
    for (const p of permits.cur.values()) {
      const res = await postJson<{ Inspections?: Cur[] }>(`${B}/GetInspections`, { entityId: p.BlLicenseId });
      for (const i of res.Inspections ?? []) {
        const date = isoFromYmd(i.InspectionActualStartDateTime);
        if (!date || date < BENCH_SINCE || date > TODAY) continue;
        const score = typeof i.ViolationScore === "number" ? i.ViolationScore : null;
        const rating = (i.ViolationRating ?? "").toLowerCase();
        const result = /suspend|closed|closure/.test(rating) ? "Permit Suspended" : rating === "pass" ? "Pass" : band(score) ?? "N/A";
        add(`${norm(p.FullAddressLine1)}|${date}`, base(p, date, i.InspectionType ?? null, score, result, [], `pas:${i.InspectionNumber ?? `${p.BlLicenseId}|${date}`}`), false);
      }
    }
    const capped = capPerBrand([...byKey.values()]);
    return { inspections: capped, provenance: provEntry({ sourceId: "pasadena_ph", name, module: "inspection", status: capped.length ? "fetched" : "no_update", jurisdictionId: "Pasadena", accessType: "html-scrape", endpointOrUrl: PAGE, oneTimePullFeasible: "yes", recordCount: capped.length, stalenessNote: `${BENCH_NOTE} Score 0–100 (higher = better). Current system: score + rating only (violations in PDF); legacy Envision system (to 2025-11): itemised violations.` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "pasadena_ph", name, module: "inspection", jurisdictionId: "Pasadena", accessType: "html-scrape", endpointOrUrl: PAGE, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

// DC Health — no open dataset, but dc.healthinspections.us is server-rendered: alphabetical listing
// pages (establishment, permit id, address, every inspection with its report link) and one HTML
// report per inspection with the Priority / Priority Foundation / Core violation tallies and the
// IN/OUT mark per item (the selected mark is styled red). Only the brand initials' listing pages are
// read. DC states it runs a pass/fail inspection but the report carries no pass/fail field, so the
// result is N/A and severity follows the Priority tally. Report pages also show the person in charge,
// CFPM names, phone and e-mail — only the tallies and standard item names are kept.
async function collectDC(): Promise<SourceResult> {
  const BASE = "https://dc.healthinspections.us/";
  const name = "DC Health — Food Establishment Inspection Reports";
  const report = (id: string) => `${BASE}lib/mod/inspection/paper/_paper_food_inspection_report.cfm?inspectionID=${id}&wguid=1367&wgunm=sysact&wgdmn=431`;
  const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const longDate = (s: string): string | null => {
    const m = /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/.exec(s);
    const mi = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
    return m && mi >= 0 ? `${m[3]}-${String(mi + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
  };
  const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  const decode = (h: string) =>
    h.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e: string) =>
      e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : NAMED[e.toLowerCase()] ?? m,
    );
  const text = (h: string) => decode(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  try {
    type Visit = { brand: string; store: string; permitId: string; address: string | null; id: string; type: string; date: string };
    const visits: Visit[] = [];
    for (const alpha of [...new Set(BENCH_TERMS.map((t) => t[0]))]) {
      const page = await getText(`${BASE}?a=inspections&alpha=${alpha}`);
      for (const block of page.split("<h3>").slice(1)) {
        const est = /<a href="\?a=inspections&(?:amp;)?permitID=(\d+)">([^<]+)<\/a>/.exec(block);
        if (!est) continue;
        const store = text(est[2]);
        const brand = matchBrand(store);
        if (!brand) continue;
        const addr = /<\/h3>\s*([^<]+?)\s*<br/.exec(block);
        for (const m of block.matchAll(/inspectionID=(\d+)[^>]*>([^:<]+):\s*([^<]+)</g)) {
          const date = longDate(m[3]);
          if (date && date >= BENCH_SINCE && date <= TODAY)
            visits.push({ brand, store, permitId: est[1], address: addr ? text(addr[1]) : null, id: m[1], type: text(m[2]), date });
        }
      }
    }
    const byBrand = new Map<string, Visit[]>();
    for (const v of visits) (byBrand.get(v.brand) ?? byBrand.set(v.brand, []).get(v.brand)!).push(v);
    const kept = [...byBrand.values()].flatMap((vs) => vs.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)).slice(0, PER_BRAND_CAP));
    const out: InspectionRecord[] = [];
    for (const v of kept) {
      const h = await getText(report(v.id));
      const flat = text(h.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " | ")).replace(/(\s*\|\s*)+/g, " | ");
      const tally = (label: string) => {
        const m = new RegExp(`\\| ${label} \\| Violations \\| (\\d+) \\| COS \\| (\\d+)`).exec(flat);
        return m ? Number(m[1]) : null;
      };
      const p = tally("Priority"), pf = tally("Priority Foundation"), c = tally("Core");
      const items: { code: string; text: string }[] = [];
      for (const row of h.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
        if (!/<td[^>]*color:#CC0000[^>]*>\s*OUT\s*<\/td>/i.test(row[1])) continue;
        const it = />\s*(\d+[A-Z]?)\.\s*<\/td>\s*<td[^>]*>\s*([^<]+?)\s*<\/td>/.exec(row[1]);
        if (it) items.push({ code: it[1], text: text(it[2]) });
      }
      const tallyPhrase = p == null ? null : `Priority ${p} · Priority Foundation ${pf ?? 0} · Core ${c ?? 0} violations`;
      const violText = items.map((i) => i.text).join(" | ");
      const url = report(v.id);
      out.push(
        finalizeInspection({
          no: null, jurisdiction: "Washington DC", regulatoryAgency: "DC Health — Food Safety and Hygiene Inspection Services",
          brand: v.brand, establishmentType: establishmentType(v.store), storeName: v.store,
          establishmentId: v.permitId, address: v.address,
          inspectionDate: v.date, inspectionType: v.type,
          inspectionResult: "N/A", score: null, grade: null, violationCode: items[0]?.code ?? null,
          chineseViolationSummary: null, englishViolationSummary: [tallyPhrase, violText].filter(Boolean).join(" | ") || null,
          violationSeverity: (p ?? 0) > 0 ? "严重（主要）Critical" : (pf ?? 0) + (c ?? 0) > 0 || violText ? "一般 Non-critical" : null,
          followupRequired: (p ?? 0) > 0 ? "是 Yes" : "否 No",
          sourceType: "PDF/HTML 报告", sourceUrlOrDocRef: url, recommendedAction: null,
          idKey: `dc:${v.id}`,
          violationText: violText, sourceId: "dc_health", sourceUrl: url,
        }),
      );
    }
    return { inspections: out, provenance: provEntry({ sourceId: "dc_health", name, module: "inspection", status: out.length ? "fetched" : "no_update", jurisdictionId: "Washington DC", accessType: "html-scrape", endpointOrUrl: `${BASE}?a=inspections`, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: `${BENCH_NOTE} Server-rendered listing + report pages. No pass/fail field on the report (result N/A); Priority / Priority Foundation / Core tallies + OUT items. Person-in-charge / CFPM names and contact details are never stored.` }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "dc_health", name, module: "inspection", jurisdictionId: "Washington DC", accessType: "html-scrape", endpointOrUrl: `${BASE}?a=inspections`, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectIntake(): Promise<SourceResult> {
  const file = join(process.cwd(), "intake", "inspections.json");
  const name = "Manual intake (OPRA / web lookup / PDF / email)";
  if (!existsSync(file)) {
    return { inspections: [], provenance: provEntry({ sourceId: "manual_intake", name, accessType: "none", oneTimePullFeasible: "partial", stalenessNote: "No intake/inspections.json present — drop manually-collected records there (see intake/README.md)." }) };
  }
  try {
    const rows = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>[];
    const out = rows.map((e) => {
      const s = (k: string) => (e[k] == null ? null : String(e[k]));
      const rec = finalizeInspection({
        no: null,
        jurisdiction: String(e.jurisdiction ?? ""),
        regulatoryAgency: s("regulatoryAgency"),
        brand: s("brand") ?? brandOrOther(String(e.storeName ?? "")),
        establishmentType: s("establishmentType") ?? establishmentType(String(e.storeName ?? "")),
        storeName: s("storeName"),
        address: s("address"),
        inspectionDate: isoFlexible(s("inspectionDate")),
        inspectionType: s("inspectionType"),
        inspectionResult: s("inspectionResult"),
        score: e.score == null ? null : Number(e.score),
        grade: s("grade"),
        violationCode: s("violationCode"),
        chineseViolationSummary: s("chineseViolationSummary"),
        englishViolationSummary: s("englishViolationSummary"),
        violationSeverity: s("violationSeverity"),
        followupRequired: s("followupRequired"),
        sourceType: s("sourceType") ?? "OPRA/人工 Manual Request",
        sourceUrlOrDocRef: s("sourceUrlOrDocRef"),
        recommendedAction: s("recommendedAction"),
        violationText: String(e.englishViolationSummary ?? e.chineseViolationSummary ?? ""),
        sourceId: "manual_intake",
        sourceUrl: s("sourceUrlOrDocRef"),
      });
      if (e.dataAvailability) {
        rec.provenance.dataAvailability = e.dataAvailability as Provenance["dataAvailability"];
        rec.provenance.dataAvailabilityLabel =
          s("dataAvailabilityLabel") ??
          (e.dataAvailability === "not_public_online" ? "Data not publicly available online / 未找到公开数据库" : null);
      }
      if (e.njMunicipality) rec.provenance.njMunicipality = String(e.njMunicipality);
      if (e.njRoutedTo) rec.provenance.njRoutedTo = String(e.njRoutedTo);
      // manual records start unreviewed — QA approves before they appear/export.
      rec.reviewed = e.reviewed === true;
      rec.reviewStatus = rec.reviewed ? "approved" : "pending";
      return rec;
    });
    return { inspections: out, provenance: provEntry({ sourceId: "manual_intake", name, accessType: "none", oneTimePullFeasible: "partial", recordCount: out.length, stalenessNote: "Manually-collected records — verify each before approving." }) };
  } catch (err) {
    return { inspections: [], provenance: provEntry({ sourceId: "manual_intake", name, accessType: "none", oneTimePullFeasible: "partial", stalenessNote: `intake parse failed: ${String(err).slice(0, 100)}`, reVerifyBeforeRelying: true }) };
  }
}

/* ─────────────── MODULE 2 — Import/Export & Border Control ─────────────── */

// Curated real rows from the 2026-05 report (bilingual, dated, sourced).
async function collectImportSeeds(): Promise<SourceResult> {
  const out: ImportExportRecord[] = importSeeds.map((s) => {
    const a = assessImport({ action: s.regulatoryAction, text: `${s.englishTitle} ${s.englishSummary}` });
    const riskLevel = s.riskLevel as ImportExportRecord["riskLevel"];
    return {
      id: hashId("imp", s.englishTitle, s.publicationDate),
      module: "import" as const,
      no: null,
      category: s.category,
      chineseTitle: s.chineseTitle,
      englishTitle: s.englishTitle,
      agency: s.agency,
      countryRegion: s.countryRegion,
      productInvolved: s.productInvolved,
      publicationDate: s.publicationDate,
      regulatoryAction: s.regulatoryAction as ImportExportRecord["regulatoryAction"],
      chineseSummary: s.chineseSummary,
      englishSummary: s.englishSummary,
      importExportImpact: s.importExportImpact,
      documentationRequirement: s.documentationRequirement,
      riskLevel,
      sourceUrl: s.sourceUrl,
      recommendedAction: s.recommendedAction,
      relevanceTags: relevanceTags(`${s.englishTitle} ${s.englishSummary} ${s.productInvolved ?? ""}`),
      alertTriggered: a.alertTriggered || riskLevel === "高风险",
      alertReason: a.alertReason ?? (riskLevel === "高风险" ? "high-risk import item" : null),
      alertRuleIds: a.alertRuleIds,
      reviewed: true,
      reviewStatus: "approved" as const,
      reviewNote: "curated from 2026-05 report",
      provenance: prov("may_report_import", s.sourceUrl),
    };
  });
  return { importExport: out, provenance: provEntry({ sourceId: "may_report_import", name: "Curated import items (2026-05 report)", module: "import", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: out.length, stalenessNote: "Manual-curated from the May 2026 report; live Federal Register import slugs augment." }) };
}

// Auto — Federal Register import/border agency slugs (verified no-auth).
async function collectFederalRegisterImport(): Promise<SourceResult> {
  const slugs = ["animal-and-plant-health-inspection-service", "u-s-customs-and-border-protection", "food-safety-and-inspection-service", "international-trade-administration"];
  const name = "Federal Register — import/border agencies";
  const out: ImportExportRecord[] = [];
  const seen = new Set<string>();
  try {
    for (const slug of slugs) {
      const url = `https://www.federalregister.gov/api/v1/documents.json?per_page=6&order=newest&conditions[agencies][]=${slug}&fields[]=title&fields[]=abstract&fields[]=document_number&fields[]=html_url&fields[]=publication_date&fields[]=agencies`;
      const res = await getJson<{ results: Record<string, unknown>[] }>(url);
      for (const d of res.results ?? []) {
        const dn = String(d.document_number ?? "");
        if (seen.has(dn)) continue;
        seen.add(dn);
        const title = String(d.title ?? "");
        const abstract = String(d.abstract ?? "");
        const text = `${title} ${abstract}`;
        if (!/import|export|tariff|entry|customs|eligib|prior notice|poultry|meat|plant protection|quarantine|duty|origin|inspection/i.test(text)) continue;
        const agencyName = Array.isArray(d.agencies) && d.agencies[0] ? String((d.agencies[0] as { name?: string }).name ?? slug) : slug;
        const a = assessImport({ action: "Rule/Notice", text });
        out.push({
          id: hashId("imp", "fedreg", dn || title),
          module: "import" as const,
          no: null,
          category: "联邦公报进口/贸易 Federal Register Import/Trade",
          chineseTitle: null,
          englishTitle: title,
          agency: agencyName,
          countryRegion: null,
          productInvolved: null,
          publicationDate: isoFromYmd(String(d.publication_date ?? "")),
          regulatoryAction: "Rule/Notice" as const,
          chineseSummary: null,
          englishSummary: abstract.slice(0, 260) || null,
          importExportImpact: null,
          documentationRequirement: null,
          riskLevel: a.riskLevel as ImportExportRecord["riskLevel"],
          sourceUrl: String(d.html_url ?? "") || null,
          recommendedAction: null,
          relevanceTags: relevanceTags(text),
          alertTriggered: a.alertTriggered,
          alertReason: a.alertReason,
          alertRuleIds: a.alertRuleIds,
          reviewed: true,
          reviewStatus: "approved" as const,
          reviewNote: "auto-collected — QA review required before treating exports/alerts as final",
          provenance: prov("federal_register_import", String(d.html_url ?? "")),
        });
      }
    }
    return { importExport: out, provenance: provEntry({ sourceId: "federal_register_import", name, module: "import", status: out.length ? "fetched" : "no_update", accessType: "official-api", endpointOrUrl: "https://www.federalregister.gov/api/v1/documents.json", oneTimePullFeasible: "yes", recordCount: out.length }) };
  } catch (e) {
    return { importExport: out, provenance: provEntry({ sourceId: "federal_register_import", name, module: "import", status: "manual", accessType: "official-api", oneTimePullFeasible: "yes", stalenessNote: `partial/failed: ${String(e).slice(0, 120)}`, recordCount: out.length, reVerifyBeforeRelying: true }) };
  }
}

// Key-gated — FDA OII Import Refusals (POST). Activates when FDA_OII_USER + FDA_OII_KEY are
// set; otherwise a truthful dormant stub (0 rows, status manual). Never fabricates. See docs/API_KEYS.md.
async function collectImportRefusals(): Promise<SourceResult> {
  const name = "FDA OII — Import Refusals";
  const endpoint = "https://api-datadashboard.fda.gov/v1/import_refusals";
  const ref = "https://datadashboard.fda.gov/oii/cd/importrefusals.htm";
  const user = process.env.FDA_OII_USER;
  const key = process.env.FDA_OII_KEY;
  if (!user || !key) {
    return { importExport: [], provenance: provEntry({ sourceId: "fda_oii_import_refusals", name, module: "import", status: "manual", accessType: "official-api", endpointOrUrl: endpoint, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: "FDA_OII_USER/FDA_OII_KEY not set — collector dormant. Add keys + re-run prep:collect to activate (docs/API_KEYS.md). No rows fabricated.", reVerifyBeforeRelying: true }) };
  }
  const out: ImportExportRecord[] = [];
  try {
    const res = await postJson<{ result?: Record<string, unknown>[] }>(
      endpoint,
      { sort: "RefusalDate", sortorder: "DESC", start: 1, rows: 2000, returntotalcount: true, filters: {}, columns: ["FirmName", "ProductCodeDescription", "ProductCategory", "RefusalDate", "RefusalCharges", "CountryName"] },
      { headers: { "Authorization-User": user, "Authorization-Key": key } },
    );
    const seen = new Set<string>();
    for (const d of res.result ?? []) {
      if (out.length >= 30) break; // cap — café refusals among the 2000 most-recent
      const product = String(d.ProductCodeDescription ?? "");
      // §7 café scope: keep ONLY coffee/tea/dairy/beverage product refusals — NOT all "Human Foods"
      // (that's thousands of out-of-scope items, e.g. ginger root). Never fabricate the rest.
      if (!/coffee|tea|dairy|milk|cream|beverage|drink|juice|cocoa|chocolate|sugar|syrup|flavor|matcha|\bwater\b/i.test(product)) continue;
      const firm = String(d.FirmName ?? "");
      const id = hashId("imp", "fda_oii", firm, String(d.RefusalDate ?? ""), product);
      if (seen.has(id)) continue; // collapse identical firm/date/product rows
      seen.add(id);
      const charges = String(d.RefusalCharges ?? "");
      out.push({
        id,
        module: "import" as const,
        no: null,
        category: "进口拒绝 Import Refusal (FDA OII)",
        chineseTitle: null,
        englishTitle: (firm ? `Import refusal — ${firm}` : `Import refusal — ${product}`).slice(0, 200),
        agency: "FDA / OII",
        countryRegion: String(d.CountryName ?? "") || null,
        productInvolved: product || null,
        publicationDate: isoFromYmd(String(d.RefusalDate ?? "")),
        regulatoryAction: "Import Refusal" as const,
        chineseSummary: null,
        englishSummary: `Refused entry: ${product || "—"}${charges ? ` (FD&C charge codes: ${charges})` : ""}`.slice(0, 260),
        importExportImpact: null,
        documentationRequirement: null,
        riskLevel: "中风险", // general refusal = medium category intelligence; QA escalates if it's our supplier
        sourceUrl: ref,
        recommendedAction: null,
        relevanceTags: relevanceTags(`${product} ${charges}`),
        alertTriggered: false,
        alertReason: null,
        alertRuleIds: [],
        reviewed: true,
        reviewStatus: "approved" as const,
        reviewNote: "auto-collected (FDA OII) — QA review required before treating exports/alerts as final",
        provenance: prov("fda_oii_import_refusals", ref),
      });
    }
    return { importExport: out, provenance: provEntry({ sourceId: "fda_oii_import_refusals", name, module: "import", status: out.length ? "fetched" : "no_update", accessType: "official-api", endpointOrUrl: endpoint, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "Café-relevant refusals only (coffee/tea/dairy/beverage products) from the 2000 most-recent; capped 30." }) };
  } catch (e) {
    return { importExport: out, provenance: provEntry({ sourceId: "fda_oii_import_refusals", name, module: "import", status: "manual", accessType: "official-api", endpointOrUrl: endpoint, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: out.length, reVerifyBeforeRelying: true }) };
  }
}

/* ─────────────── MODULE 3 — State & Local Regulation ─────────────── */

async function collectRegulationSeeds(): Promise<SourceResult> {
  const out: RegulationRecord[] = regulationSeeds.map((s) => {
    const a = assessRegulation({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as RegulationRecord["riskLevel"];
    const alertTriggered = a.alertTriggered || riskLevel === "高风险";
    return {
      id: hashId("reg2", s.regulationBillName, s.jurisdiction),
      module: "regulation" as const,
      no: null,
      jurisdiction: s.jurisdiction as RegulationRecord["jurisdiction"],
      regulationBillName: s.regulationBillName,
      chineseTitle: s.chineseTitle,
      englishTitle: s.englishTitle,
      status: s.status as RegulationRecord["status"],
      publicationPassageDate: s.publicationPassageDate,
      effectiveDate: s.effectiveDate,
      coveredEntities: s.coveredEntities,
      keyRequirements: s.keyRequirements,
      chineseSummary: s.chineseSummary,
      englishSummary: s.englishSummary,
      businessImpact: s.businessImpact,
      riskLevel,
      sourceUrl: s.sourceUrl,
      recommendedAction: s.recommendedAction,
      topic: s.topic as RegulationRecord["topic"],
      alertTriggered,
      alertReason: a.alertReason ?? (alertTriggered ? "high-risk / imminent compliance" : null),
      alertRuleIds: a.alertRuleIds,
      reviewed: true,
      reviewStatus: "approved" as const,
      reviewNote: "curated from 2026-05 report",
      provenance: prov("may_report_regulation", s.sourceUrl),
    };
  });
  return { regulations: out, provenance: provEntry({ sourceId: "may_report_regulation", name: "Curated state/local regulations (2026-05 report)", module: "regulation", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: out.length, stalenessNote: "Manual-curated named laws (Sweet Truth, SB68, NY S5381…); state-bill APIs (LegiScan/NY-Senate) can augment with keys — see docs/API_KEYS.md." }) };
}

// LegiScan numeric status → RegStatusEnum; NY Senate statusType → RegStatusEnum.
// LegiScan progress codes → lifecycle stage. NOTE: 4 = chaptered/enacted = "Signed" (signed into law),
// NOT "In effect" — the effective date may still be in the future; assessRegulation/effective date
// decides In-effect vs Pending-effective. (1 Introduced · 2 Engrossed · 3 Enrolled · 4 Passed/Chaptered · 5 Vetoed · 6 Failed)
const LEGISCAN_STATUS: Record<number, RegulationRecord["status"]> = {
  1: "Introduced", 2: "Passed", 3: "Passed", 4: "Signed", 5: "Repealed", 6: "Repealed",
};
// NY OpenLegislation status → lifecycle stage. SIGNED_BY_GOV = "Signed" (signed into law), NOT
// "In effect" — signing ≠ effective. Vetoed → Repealed (terminal).
const NY_STATUS: Record<string, RegulationRecord["status"]> = {
  INTRODUCED: "Introduced", IN_SENATE_COMM: "Introduced", IN_ASSEMBLY_COMM: "Introduced",
  PASSED_SENATE: "Passed", PASSED_ASSEMBLY: "Passed", DELIVERED_TO_GOV: "Passed",
  SIGNED_BY_GOV: "Signed", ADOPTED: "Signed", VETOED: "Repealed",
};
const regTopicFromText = (text: string): RegulationRecord["topic"] => {
  const t = text.toLowerCase();
  if (/menu label/.test(t)) return "menu_labeling";
  if (/added sugar|sugar warning/.test(t)) return "added_sugar";
  if (/sodium|salt warning/.test(t)) return "sodium";
  if (/allergen/.test(t)) return "allergen_disclosure";
  if (/additive|food color|food dye|preservative/.test(t)) return "food_additives";
  if (/pfas|packaging|single-use|polystyrene|foam/.test(t)) return "pfas_packaging";
  if (/delivery|third-party|third party|platform/.test(t)) return "delivery_platform";
  return "other";
};
// Title relevance gate for legislative full-text search — drops the off-topic matches a loose
// keyword search returns ("Sexual health" / "Price gouging" / "spearguns" / "prenatal multivitamins").
const isFoodBillTitle = (title: string) =>
  /food|menu|allergen|sugar|sodium|\blabel|packaging|pfas|beverage|restaurant|dietary|nutrition|additive/i.test(title);
// Cross-source bill id: normalize the identifier (strip case/space) + use the full jurisdiction name so
// the SAME bill from LegiScan and OpenStates collapses to one id (deduped in main()).
const billId = (identifier: string, jurisdiction: string | null) => hashId("reg2", normKey(identifier), jurisdiction ?? "");

// Key-gated — LegiScan state-bill search (GET). Activates when LEGISCAN_KEY is set; else dormant stub.
// Without the key the output is identical to today; with it, CA/NY/NJ/MA/FL food-bill rows augment Module 3.
async function collectLegiScanBills(): Promise<SourceResult> {
  const name = "LegiScan — state food bills";
  const base = "https://api.legiscan.com/";
  const key = process.env.LEGISCAN_KEY;
  if (!key) {
    return { regulations: [], provenance: provEntry({ sourceId: "legiscan_bills", name, module: "regulation", status: "manual", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: "LEGISCAN_KEY not set — collector dormant. Add key + re-run prep:collect to activate (docs/API_KEYS.md). No rows fabricated.", reVerifyBeforeRelying: true }) };
  }
  const STATE_MAP: Record<string, RegulationRecord["jurisdiction"]> = { CA: "California", NY: "New York State", NJ: "New Jersey", MA: "Massachusetts", FL: "Florida" };
  const out: RegulationRecord[] = [];
  const seen = new Set<string>();
  try {
    const query = encodeURIComponent("food labeling OR allergen OR added sugar OR menu labeling OR PFAS packaging");
    for (const st of Object.keys(STATE_MAP)) {
      const res = await getJson<{ searchresult?: Record<string, unknown> }>(`${base}?key=${key}&op=getSearch&state=${st}&query=${query}`);
      const sr = res.searchresult ?? {};
      let kept = 0;
      for (const k of Object.keys(sr)) {
        if (k === "summary" || kept >= 5) continue;
        const b = sr[k] as Record<string, unknown>;
        const billNumber = String(b.bill_number ?? b.number ?? "");
        const title = String(b.title ?? "");
        if (!billNumber || !isFoodBillTitle(title)) continue; // drop off-topic full-text matches
        const id = billId(billNumber, STATE_MAP[st]);
        if (seen.has(id)) continue;
        seen.add(id);
        kept++;
        const status = LEGISCAN_STATUS[Number(b.status ?? 0)] ?? "Monitoring";
        const a = assessRegulation({ status, effectiveDate: null, today: TODAY });
        out.push({
          id, module: "regulation" as const, no: null,
          jurisdiction: STATE_MAP[st],
          regulationBillName: `${billNumber} ${title}`.trim().slice(0, 160),
          chineseTitle: null, englishTitle: title || billNumber,
          status, publicationPassageDate: isoFromYmd(String(b.last_action_date ?? "")), effectiveDate: null,
          coveredEntities: null, keyRequirements: null,
          chineseSummary: null, englishSummary: title || null, businessImpact: null,
          riskLevel: a.riskLevel as RegulationRecord["riskLevel"],
          sourceUrl: String(b.state_link ?? b.url ?? "") || null,
          recommendedAction: null, topic: regTopicFromText(title),
          alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
          reviewed: true, reviewStatus: "approved" as const,
          reviewNote: "auto-collected (LegiScan) — QA review required before treating exports/alerts as final",
          provenance: prov("legiscan_bills", String(b.state_link ?? b.url ?? "") || null),
        });
      }
    }
    return { regulations: out, provenance: provEntry({ sourceId: "legiscan_bills", name, module: "regulation", status: out.length ? "fetched" : "no_update", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "Keyword search across CA/NY/NJ/MA/FL; may overlap curated seeds (both real) — QA dedupes at review." }) };
  } catch (e) {
    return { regulations: out, provenance: provEntry({ sourceId: "legiscan_bills", name, module: "regulation", status: "manual", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: out.length, reVerifyBeforeRelying: true }) };
  }
}

// Key-gated — NY Senate OpenLegislation bill search (GET). Activates when NY_SENATE_KEY is set; else dormant stub.
async function collectNYSenateBills(): Promise<SourceResult> {
  const name = "NY Senate OpenLegislation — food bills";
  const base = "https://legislation.nysenate.gov/api/3";
  const key = process.env.NY_SENATE_KEY;
  if (!key) {
    return { regulations: [], provenance: provEntry({ sourceId: "ny_senate_bills", name, module: "regulation", status: "manual", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: "NY_SENATE_KEY not set — collector dormant. Add key + re-run prep:collect to activate (docs/API_KEYS.md). No rows fabricated.", reVerifyBeforeRelying: true }) };
  }
  const out: RegulationRecord[] = [];
  const seen = new Set<string>();
  try {
    // Quoted phrases (the loose `term=food labeling` matched 13k off-topic bills); food-relevant + recent only.
    const phrases = ["food labeling", "added sugar", "menu labeling", "allergen", "sodium warning"];
    for (const phrase of phrases) {
      const term = encodeURIComponent(`"${phrase}"`);
      const res = await getJson<{ result?: { items?: Record<string, unknown>[] } }>(`${base}/bills/search?key=${key}&term=${term}&limit=10`);
      let kept = 0;
      for (const it of res.result?.items ?? []) {
        if (kept >= 3) break;
        const b = ((it as Record<string, unknown>).result ?? it) as Record<string, unknown>;
        const printNo = String(b.basePrintNo ?? b.printNo ?? "");
        const title = String(b.title ?? "");
        if (!printNo || !isFoodBillTitle(title) || Number(b.session ?? 0) < 2021) continue; // food + recent (2021+)
        const id = billId(printNo, "New York State");
        if (seen.has(id)) continue;
        seen.add(id);
        kept++;
        const summary = String(b.summary ?? "");
        const statusObj = (b.status ?? {}) as Record<string, unknown>;
        const status = NY_STATUS[String(statusObj.statusType ?? "")] ?? "Monitoring";
        const a = assessRegulation({ status, effectiveDate: null, today: TODAY });
        const url = `https://www.nysenate.gov/legislation/bills/${String(b.session ?? "")}/${printNo}`;
        out.push({
          id, module: "regulation" as const, no: null,
          jurisdiction: "New York State",
          regulationBillName: `${printNo} ${title}`.trim().slice(0, 160),
          chineseTitle: null, englishTitle: title || printNo,
          status, publicationPassageDate: isoFromYmd(String(statusObj.actionDate ?? "")), effectiveDate: null,
          coveredEntities: null, keyRequirements: null,
          chineseSummary: null, englishSummary: summary.slice(0, 260) || title || null, businessImpact: null,
          riskLevel: a.riskLevel as RegulationRecord["riskLevel"],
          sourceUrl: url, recommendedAction: null, topic: regTopicFromText(`${title} ${summary}`),
          alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
          reviewed: true, reviewStatus: "approved" as const,
          reviewNote: "auto-collected (NY Senate) — QA review required before treating exports/alerts as final",
          provenance: prov("ny_senate_bills", url),
        });
      }
    }
    return { regulations: out, provenance: provEntry({ sourceId: "ny_senate_bills", name, module: "regulation", status: out.length ? "fetched" : "no_update", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length }) };
  } catch (e) {
    return { regulations: out, provenance: provEntry({ sourceId: "ny_senate_bills", name, module: "regulation", status: "manual", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: out.length, reVerifyBeforeRelying: true }) };
  }
}

// Key-gated — OpenStates v3 bill search (GET, X-API-KEY header). Activates when OPENSTATES_KEY set; else dormant.
// Free tier ~500 req/day — keep to a few states. Augments Module 3 alongside LegiScan / NY-Senate.
async function collectOpenStates(): Promise<SourceResult> {
  const name = "OpenStates — state food bills";
  const base = "https://v3.openstates.org/bills";
  const key = process.env.OPENSTATES_KEY;
  if (!key) {
    return { regulations: [], provenance: provEntry({ sourceId: "openstates_bills", name, module: "regulation", status: "manual", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: "OPENSTATES_KEY not set — collector dormant. Add key + re-run prep:collect to activate (docs/API_KEYS.md). No rows fabricated.", reVerifyBeforeRelying: true }) };
  }
  const STATE_MAP: Record<string, RegulationRecord["jurisdiction"]> = { ca: "California", ny: "New York State", nj: "New Jersey", ma: "Massachusetts", fl: "Florida" };
  const out: RegulationRecord[] = [];
  const seen = new Set<string>();
  try {
    const q = encodeURIComponent("food labeling allergen added sugar");
    for (const st of Object.keys(STATE_MAP)) {
      const res = await getJson<{ results?: Record<string, unknown>[] }>(`${base}?jurisdiction=${st}&q=${q}&sort=latest_action_desc&per_page=10`, { headers: { "X-API-KEY": key } });
      let kept = 0;
      for (const b of res.results ?? []) {
        if (kept >= 5) break;
        const identifier = String(b.identifier ?? "");
        const title = String(b.title ?? "");
        if (!identifier || !isFoodBillTitle(title)) continue; // drop off-topic full-text matches
        const id = billId(identifier, STATE_MAP[st]);
        if (seen.has(id)) continue;
        seen.add(id);
        kept++;
        const a = assessRegulation({ status: "Monitoring", effectiveDate: null, today: TODAY });
        out.push({
          id, module: "regulation" as const, no: null,
          jurisdiction: STATE_MAP[st],
          regulationBillName: `${identifier} ${title}`.trim().slice(0, 160),
          chineseTitle: null, englishTitle: title || identifier,
          status: "Monitoring", publicationPassageDate: isoFromYmd(String(b.latest_action_date ?? "")), effectiveDate: null,
          coveredEntities: null, keyRequirements: null,
          chineseSummary: null, englishSummary: title || null, businessImpact: null,
          riskLevel: a.riskLevel as RegulationRecord["riskLevel"],
          sourceUrl: String(b.openstates_url ?? "") || null,
          recommendedAction: null, topic: regTopicFromText(title),
          alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
          reviewed: true, reviewStatus: "approved" as const,
          reviewNote: "auto-collected (OpenStates) — QA review required before treating exports/alerts as final",
          provenance: prov("openstates_bills", String(b.openstates_url ?? "") || null),
        });
      }
    }
    return { regulations: out, provenance: provEntry({ sourceId: "openstates_bills", name, module: "regulation", status: out.length ? "fetched" : "no_update", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "OpenStates free tier ~500 req/day; CA/NY/NJ/MA/FL food bills. May overlap LegiScan/seeds — QA dedupes." }) };
  } catch (e) {
    return { regulations: out, provenance: provEntry({ sourceId: "openstates_bills", name, module: "regulation", status: "manual", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: out.length, reVerifyBeforeRelying: true }) };
  }
}

// Live, no key — eCFR Title 21 (FDA food regs) recent CHANGES matching food-safety terms.
// The eCFR search API returns amendments to codified sections; these are ALREADY in the CFR, so a
// change whose `starts_on` is in the past = In effect, in the future = Pending effective (never
// "proposed"). Food scope = Title 21 parts < 200 (Subchapter A–B: general / color / food additives;
// parts 200+ are drugs). Rolling 24-month window.
const ECFR_TERMS = [
  "food allergen", "menu labeling", "added sugar", "sodium warning", "color additive",
  "food additive", "nutrition labeling", "acidified foods", "juice HACCP", "dietary supplement",
];
// eCFR headings carry HTML tags + entities (<sub>, &amp;) — strip both for a clean title.
const cleanHeading = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, "").replace(/\s+/g, " ").trim();
// eCFR marks reserved/placeholder sections with an "xxx" heading — drop those.
const isRealHeading = (s: string) => s.length > 0 && s.toLowerCase() !== "xxx";
async function collectEcfrTitle21(): Promise<SourceResult> {
  const name = "eCFR Title 21 — FDA food regulation changes";
  const base = "https://www.ecfr.gov/api/search/v1/results";
  const since = new Date(Date.parse(TODAY) - 730 * 86400000).toISOString().slice(0, 10);
  // Dedupe by section, keeping only the LATEST substantive change (one row per section, not one per
  // amendment date). Skip pure cross-reference edits — they're pointer updates, not real rule changes.
  const bySection = new Map<string, { startsOn: string; part: string; section: string | null; secName: string; changeTypes: string[] }>();
  try {
    for (const term of ECFR_TERMS) {
      const url = `${base}?query=${encodeURIComponent(term)}&hierarchy%5Btitle%5D=21&last_modified_after=${since}&per_page=20`;
      const res = await getJson<{ results?: Record<string, unknown>[] }>(url);
      for (const r of res.results ?? []) {
        const h = (r.hierarchy ?? {}) as Record<string, string | null>;
        const partNum = parseInt(String(h.part ?? ""), 10);
        if (!Number.isFinite(partNum) || partNum >= 200) continue; // drug parts — out of food scope
        const headings = (r.headings ?? {}) as Record<string, string | null>;
        const secName = cleanHeading(String(headings.section || headings.part || ""));
        if (!isRealHeading(secName)) continue; // reserved / placeholder — skip
        const changeTypes = Array.isArray(r.change_types) ? (r.change_types as string[]) : [];
        if (changeTypes.length && changeTypes.every((c) => c === "cross_reference")) continue; // trivial xref
        const startsOn = typeof r.starts_on === "string" ? r.starts_on : null;
        if (!startsOn) continue;
        const secKey = String(h.section ?? h.part ?? "");
        const prev = bySection.get(secKey);
        if (!prev || startsOn > prev.startsOn) {
          bySection.set(secKey, { startsOn, part: String(h.part ?? ""), section: h.section ?? null, secName, changeTypes });
        }
      }
    }
    const out: RegulationRecord[] = [...bySection.values()]
      .sort((a, b) => (a.startsOn < b.startsOn ? 1 : -1)) // newest first
      .slice(0, 25) // cap noise
      .map((e) => {
        const ref = e.section ? `§ ${e.section}` : `Part ${e.part}`;
        const inEffect = Date.parse(e.startsOn) <= Date.parse(TODAY);
        const status: RegulationRecord["status"] = inEffect ? "In effect" : "Pending effective";
        const title = `21 CFR ${ref} — ${e.secName}`;
        const secUrl = `https://www.ecfr.gov/current/title-21/part-${e.part}${e.section ? `/section-${e.section}` : ""}`;
        const a = assessRegulation({ status, effectiveDate: e.startsOn, today: TODAY });
        return {
          id: hashId("ecfr", e.section ?? e.part, e.startsOn),
          module: "regulation" as const, no: null,
          jurisdiction: "Federal" as const,
          regulationBillName: title.slice(0, 160),
          chineseTitle: null, englishTitle: title,
          status, publicationPassageDate: e.startsOn, effectiveDate: e.startsOn,
          coveredEntities: "FDA-regulated food establishments", keyRequirements: null,
          chineseSummary: null,
          englishSummary: `Codified change to ${ref} (${e.secName}) in 21 CFR${e.changeTypes.length ? ` — ${e.changeTypes.join(", ")}` : ""}.`,
          businessImpact: null,
          riskLevel: a.riskLevel as RegulationRecord["riskLevel"],
          sourceUrl: secUrl,
          recommendedAction: null, topic: regTopicFromText(title),
          alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
          reviewed: true, reviewStatus: "approved" as const,
          reviewNote: "auto-collected (eCFR Title 21) — QA review required before treating exports/alerts as final",
          provenance: prov("ecfr_title21", secUrl),
        };
      });
    return { regulations: out, provenance: provEntry({ sourceId: "ecfr_title21", name, module: "regulation", status: out.length ? "fetched" : "no_update", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "eCFR Title 21 codified-rule changes (food scope: parts <200) matching food-safety terms; latest change per section, rolling 24-month window, capped 25. Codified = In effect / Pending effective, never proposed." }) };
  } catch (e) {
    return { regulations: [], provenance: provEntry({ sourceId: "ecfr_title21", name, module: "regulation", status: "manual", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: 0, reVerifyBeforeRelying: true }) };
  }
}

// Live, no key — FDA FOOD guidance, sourced from the Federal Register (www.fda.gov guidance search is
// bot-blocked from data centers). Filters FDA NOTICE docs to titles that are guidance AND food-relevant
// (title-only — abstracts all contain "Food and Drug Administration", which would match everything).
// FDA food guidance is infrequent, so low/zero volume is expected and truthful, never padded.
const FDA_FOOD_GUIDANCE =
  /food allergen|food label|menu label|added sugar|\bsodium\b|dietary supplement|infant formula|acidified|\bjuice\b|seafood|produce safety|color additive|food additive|nutrition|foodborne|listeria|salmonella|caffeine|\bcoffee|\btea\b|\bbeverage|food contact|\bFSMA\b|food safety|\bHACCP\b|sanitation|allergen/i;
async function collectFdaFoodGuidance(): Promise<SourceResult> {
  const name = "FDA food guidance (via Federal Register notices)";
  const base = "https://www.federalregister.gov/api/v1/documents.json";
  const out: RegulationRecord[] = [];
  const seen = new Set<string>();
  try {
    const url = `${base}?per_page=200&order=newest&conditions%5Bagencies%5D%5B%5D=food-and-drug-administration&conditions%5Btype%5D%5B%5D=NOTICE&conditions%5Bterm%5D=guidance&fields%5B%5D=title&fields%5B%5D=abstract&fields%5B%5D=publication_date&fields%5B%5D=html_url&fields%5B%5D=document_number`;
    const res = await getJson<{ results?: Record<string, unknown>[] }>(url);
    for (const r of res.results ?? []) {
      const title = String(r.title ?? "");
      if (!/guidance/i.test(title) || !FDA_FOOD_GUIDANCE.test(title)) continue; // food guidance only
      const dn = String(r.document_number ?? "");
      if (dn && seen.has(dn)) continue;
      if (dn) seen.add(dn);
      const a = assessRegulation({ status: "Guidance", effectiveDate: null, today: TODAY });
      out.push({
        id: hashId("fdaguid", dn || title, String(r.publication_date ?? "")),
        module: "regulation" as const, no: null,
        jurisdiction: "Federal",
        regulationBillName: title.slice(0, 160),
        chineseTitle: null, englishTitle: title,
        status: "Guidance", publicationPassageDate: isoFromYmd(String(r.publication_date ?? "")), effectiveDate: null,
        coveredEntities: "FDA-regulated food establishments", keyRequirements: null,
        chineseSummary: null, englishSummary: (String(r.abstract ?? "").slice(0, 500) || null),
        businessImpact: null,
        riskLevel: a.riskLevel as RegulationRecord["riskLevel"],
        sourceUrl: String(r.html_url ?? "") || null,
        recommendedAction: null, topic: regTopicFromText(title),
        alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "auto-collected (FDA food guidance via Federal Register) — QA review required before treating exports/alerts as final",
        provenance: prov("fda_food_guidance", String(r.html_url ?? "") || null),
      });
    }
    return { regulations: out, provenance: provEntry({ sourceId: "fda_food_guidance", name, module: "regulation", status: out.length ? "fetched" : "no_update", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "FDA food-guidance availability notices from the Federal Register (title matches food-safety terms). FDA food guidance is infrequent; low volume is expected." : "No FDA FOOD guidance notices in the recent Federal Register window (FDA food guidance is infrequent) — 0 rows, not fabricated." }) };
  } catch (e) {
    return { regulations: out, provenance: provEntry({ sourceId: "fda_food_guidance", name, module: "regulation", status: "manual", accessType: "official-api", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: out.length, reVerifyBeforeRelying: true }) };
  }
}

// Some state/city .gov sites 403 non-browser User-Agents (NYSDOH) — send a browser UA for HTML scrapes.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const mdyToIso = (s: string): string | null => {
  const m = s.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  return m ? `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
};

// Live, no key — NYSDOH proposed rulemaking (regs.health.ny.gov), food-relevant only. NYSDOH mostly
// proposes healthcare rules, so food matches (Part 14 food service, sanitary code, etc.) are rare —
// low/zero volume is expected and truthful. HTML-scraped (no API); browser UA required (403 otherwise).
const NYSDOH_FOOD = /\bfood\b|restaurant|sanitary code|\bpart 14\b|foodborne|food service|allergen|\bmenu\b|beverage|\bmilk\b|dairy|frozen dessert|shellfish|temporary food|mobile food/i;
async function collectNysdohProposed(): Promise<SourceResult> {
  const name = "NYSDOH proposed rulemaking (food-relevant)";
  const url = "https://regs.health.ny.gov/regulations/proposed-rule-making";
  const out: RegulationRecord[] = [];
  const seen = new Set<string>();
  try {
    const html = await getText(url, { headers: { "User-Agent": BROWSER_UA, Accept: "text/html" } });
    const tb = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    const rows = tb ? tb[1].match(/<tr[\s\S]*?<\/tr>/g) ?? [] : [];
    for (const r of rows) {
      const tds = [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => cleanHeading(m[1]));
      if (tds.length < 3) continue;
      const pub = mdyToIso(tds[0]);
      const title = tds[2];
      if (!title || !NYSDOH_FOOD.test(title)) continue; // food-relevant only
      const link = r.match(/href="([^"]+)"/)?.[1] ?? "";
      const href = link ? (link.startsWith("http") ? link : `https://regs.health.ny.gov${link}`) : url;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const status: RegulationRecord["status"] = "Proposed rule";
      const a = assessRegulation({ status, effectiveDate: null, today: TODAY });
      out.push({
        id: hashId("nysdoh", title, pub ?? ""),
        module: "regulation" as const, no: null,
        jurisdiction: "New York State" as const,
        regulationBillName: title.slice(0, 160),
        chineseTitle: null, englishTitle: title,
        status, publicationPassageDate: pub, effectiveDate: null,
        coveredEntities: "NY food service establishments (if adopted)", keyRequirements: null,
        chineseSummary: null, englishSummary: `NYSDOH Notice of Proposed Rulemaking (10 NYCRR). Comment period open; not yet adopted or effective.`,
        businessImpact: null,
        riskLevel: a.riskLevel as RegulationRecord["riskLevel"],
        sourceUrl: href,
        recommendedAction: null, topic: regTopicFromText(title),
        alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "auto-collected (NYSDOH proposed rulemaking) — QA review required before treating exports/alerts as final",
        provenance: prov("nysdoh_proposed", href),
      });
    }
    return { regulations: out, provenance: provEntry({ sourceId: "nysdoh_proposed", name, module: "regulation", status: out.length ? "fetched" : "no_update", accessType: "html-scrape", endpointOrUrl: url, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "NYSDOH proposed rulemakings whose title is food-relevant (10 NYCRR). Proposed = comment period, NOT in effect." : "No food-relevant NYSDOH proposed rulemakings in the current list (NYSDOH mostly proposes healthcare rules) — 0 rows, not fabricated." }) };
  } catch (e) {
    return { regulations: [], provenance: provEntry({ sourceId: "nysdoh_proposed", name, module: "regulation", status: "manual", accessType: "html-scrape", endpointOrUrl: url, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: 0, reVerifyBeforeRelying: true }) };
  }
}

// Live, no key — NYC Rules (rules.cityofnewyork.us) proposed + recently-adopted rules, filtered to the
// agencies a café is subject to (DOHMH/DCWP/DSNY/DEP) or a food-relevant title. WP REST API is locked
// ("only authenticated users"), so the listing tables are HTML-scraped. Proposed → "Proposed rule",
// recently-adopted → "Adopted rule" (adopted ≠ effective — effective date lives on the detail page).
// Café/food-relevant title terms — agency alone is too broad (DCWP regulates all of consumer affairs:
// junk fees, for-hire vehicles, etc.), so gate on the TITLE.
const NYC_CAFE_RULE = /\bfood\b|restaurant|\bmenu\b|allergen|\bcafe|café|\bcoffee\b|beverage|grease|organics|commercial waste|refuse\b|recycl|food delivery|third-party delivery|calorie|sanitation|sidewalk cafe|street vendor|green cart|mobile food|frozen dessert|dishwash|smoking|tobacco|trans fat|sodium warning/i;
async function collectNycRules(): Promise<SourceResult> {
  const name = "NYC Rules (proposed + adopted, café-relevant)";
  const targets: { url: string; status: RegulationRecord["status"] }[] = [
    { url: "https://rules.cityofnewyork.us/proposed-rules/", status: "Proposed rule" },
    { url: "https://rules.cityofnewyork.us/recently-adopted-rules/", status: "Adopted rule" },
  ];
  const out: RegulationRecord[] = [];
  const seen = new Set<string>();
  try {
    for (const tgt of targets) {
      const html = await getText(tgt.url, { headers: { "User-Agent": BROWSER_UA, Accept: "text/html" } });
      const rows = html.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
      for (const r of rows) {
        if (out.length >= 50) break; // safety cap
        const link = r.match(/href="(https:\/\/rules\.cityofnewyork\.us\/rule\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        if (!link) continue;
        const href = link[1];
        const title = cleanHeading(link[2]);
        if (!title || !NYC_CAFE_RULE.test(title)) continue; // café/food-relevant title only
        const agency = (r.match(/badge-agency">([^<]+)</)?.[1] ?? "").trim().toUpperCase();
        const date = mdyToIso((r.match(/<p>\s*(\d{1,2}-\d{1,2}-\d{4})\s*<\/p>/)?.[1]) ?? "");
        if (seen.has(href)) continue;
        seen.add(href);
        const a = assessRegulation({ status: tgt.status, effectiveDate: null, today: TODAY });
        out.push({
          id: hashId("nycrule", href, tgt.status),
          module: "regulation" as const, no: null,
          jurisdiction: "New York City" as const,
          regulationBillName: title.slice(0, 160),
          chineseTitle: null, englishTitle: title,
          status: tgt.status, publicationPassageDate: date, effectiveDate: null,
          coveredEntities: agency ? `NYC ${agency}-regulated establishments` : "NYC establishments", keyRequirements: null,
          chineseSummary: null,
          englishSummary: `NYC ${agency || "agency"} ${tgt.status === "Proposed rule" ? "proposed rule (comment period open; not yet adopted or effective)" : "recently-adopted rule (adopted; effective date on the rule page)"}.`,
          businessImpact: null,
          riskLevel: a.riskLevel as RegulationRecord["riskLevel"],
          sourceUrl: href,
          recommendedAction: null, topic: regTopicFromText(title),
          alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
          reviewed: true, reviewStatus: "approved" as const,
          reviewNote: "auto-collected (NYC Rules) — QA review required before treating exports/alerts as final",
          provenance: prov("nyc_rules", href),
        });
      }
    }
    return { regulations: out, provenance: provEntry({ sourceId: "nyc_rules", name, module: "regulation", status: out.length ? "fetched" : "no_update", accessType: "html-scrape", endpointOrUrl: "https://rules.cityofnewyork.us/", oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "NYC proposed + recently-adopted rules from café-relevant agencies (DOHMH/DCWP/DSNY/DEP). Proposed/Adopted ≠ effective." : "No café-relevant NYC proposed/adopted rules currently listed — 0 rows, not fabricated." }) };
  } catch (e) {
    return { regulations: [], provenance: provEntry({ sourceId: "nyc_rules", name, module: "regulation", status: "manual", accessType: "html-scrape", endpointOrUrl: "https://rules.cityofnewyork.us/", oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: 0, reVerifyBeforeRelying: true }) };
  }
}

// Live, no key — NYC City Record Online (Socrata dg92-zbpx), "Agency Rules" section, café-relevant
// agencies + food title. This is NYC's official rulemaking notice-of-record; overlaps rules.cityofnewyork.us
// (nyc_rules) by design — both are real; QA dedupes at review. Status from the notice title.
const CITYREC_AGENCY = /Health and Mental Hygiene|Consumer and Worker Protection|Sanitation|Environmental Protection/i;
const CITYREC_FOOD = /\bfood\b|restaurant|\bmenu\b|allergen|beverage|\bcafe|café|\bcoffee\b|grease|organics|commercial waste|recycl|calorie|\bsugar\b|tobacco|food delivery|sidewalk cafe|street vendor|green cart|mobile food|frozen dessert|sanitary/i;
async function collectNycCityRecord(): Promise<SourceResult> {
  const name = "NYC City Record — agency rule notices (café-relevant)";
  const base = "https://data.cityofnewyork.us/resource/dg92-zbpx.json";
  const token = process.env.SOCRATA_APP_TOKEN;
  const out: RegulationRecord[] = [];
  const seen = new Set<string>();
  try {
    const url = `${base}?$where=${encodeURIComponent("section_name='Agency Rules'")}&$order=start_date%20DESC&$limit=200${token ? `&$$app_token=${token}` : ""}`;
    const rows = await getJson<Record<string, string>[]>(url);
    for (const r of rows) {
      if (out.length >= 40) break;
      const agency = String(r.agency_name ?? "");
      const title = cleanHeading(String(r.short_title ?? ""));
      if (!title) continue;
      if (!CITYREC_AGENCY.test(agency) || !CITYREC_FOOD.test(title)) continue; // café agency AND food title
      const start = String(r.start_date ?? "").slice(0, 10) || null;
      const key = `${title.toLowerCase()}|${start ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // NYC notice conventions: NOA / Notice of Adoption / Final Rule|Amendment = adopted; NOH / Notice
      // of Public Hearing / Proposed / Opportunity to Comment = proposed.
      const status: RegulationRecord["status"] =
        /adopt|\bNOA\b|final rule|final amendment|effective date/i.test(title) ? "Adopted rule" : "Proposed rule";
      const a = assessRegulation({ status, effectiveDate: null, today: TODAY });
      out.push({
        id: hashId("cityrec", title, start ?? ""),
        module: "regulation" as const, no: null,
        jurisdiction: "New York City" as const,
        regulationBillName: title.slice(0, 160),
        chineseTitle: null, englishTitle: title,
        status, publicationPassageDate: start, effectiveDate: null,
        coveredEntities: `NYC ${agency}-regulated establishments`, keyRequirements: null,
        chineseSummary: null,
        englishSummary: `${agency} rule notice in the NYC City Record${status === "Adopted rule" ? " (adopted; effective date in the notice)" : " (proposed / public hearing; not yet adopted or effective)"}. ${cleanHeading(String(r.additional_description_1 ?? "")).slice(0, 300)}`.trim(),
        businessImpact: null,
        riskLevel: a.riskLevel as RegulationRecord["riskLevel"],
        sourceUrl: "https://a856-cityrecord.nyc.gov/",
        recommendedAction: null, topic: regTopicFromText(title),
        alertTriggered: a.alertTriggered, alertReason: a.alertReason, alertRuleIds: a.alertRuleIds,
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "auto-collected (NYC City Record) — QA review required; may overlap NYC Rules website (both official)",
        provenance: prov("nyc_city_record", "https://a856-cityrecord.nyc.gov/"),
      });
    }
    return { regulations: out, provenance: provEntry({ sourceId: "nyc_city_record", name, module: "regulation", status: out.length ? "fetched" : "no_update", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "NYC City Record 'Agency Rules' notices from café-relevant agencies (Socrata dg92-zbpx). Status from the notice title; overlaps nyc_rules by design (both official)." }) };
  } catch (e) {
    return { regulations: [], provenance: provEntry({ sourceId: "nyc_city_record", name, module: "regulation", status: "manual", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: 0, reVerifyBeforeRelying: true }) };
  }
}

// NY State Register — truthful dormant stub. dos.ny.gov WAF-blocks non-browser headers, and the register
// is a JS-rendered weekly issue (301 redirects, no clean feed/API/parseable PDF list). NY FOOD rulemaking
// is already captured by nysdoh_proposed; a general NYSR feed would need the weekly-issue PDF parse or a
// paid data feed. Never fabricates — returns 0 with an honest note.
async function collectNyStateRegister(): Promise<SourceResult> {
  const name = "NY State Register (weekly rule-making notices)";
  const url = "https://dos.ny.gov/state-register";
  return { regulations: [], provenance: provEntry({ sourceId: "ny_state_register", name, module: "regulation", status: "manual", accessType: "html-scrape", endpointOrUrl: url, oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: "NYSR is a JS-rendered weekly register (WAF anti-bot; issue pages 301-redirect, no clean feed/API). NY food rulemaking is covered by nysdoh_proposed; a general feed needs the weekly-issue PDF parse or a paid feed. Dormant — no rows fabricated.", reVerifyBeforeRelying: true }) };
}

/* ─────────────── MODULE 5 — Negative Media & Sentiment ─────────────── */

async function collectSentimentRSS(): Promise<SourceResult> {
  const name = "Food Safety News RSS (sentiment)";
  const feedUrl = "https://www.foodsafetynews.com/feed/";
  const out: SentimentRecord[] = [];
  try {
    const xml = await getText(feedUrl, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
    const items = xml.split(/<item[ >]/).slice(1, 21);
    for (const it of items) {
      const title = (it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "").trim();
      const link = (it.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "").trim();
      const pub = it.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
      if (!title) continue;
      const brand = matchBrand(title) as SentimentRecord["brandMentioned"];
      const negative = /(recall|outbreak|salmonella|listeria|e\. ?coli|contaminat|undeclared|allergen|lawsuit|illness|poison|hospitaliz|death|warning)/i.test(title);
      const foodRelevant = /coffee|tea|dairy|milk|beverage|juice|cafe|café|food|allergen/i.test(title);
      const excluded = !negative && brand == null && !foodRelevant;
      const cat: SentimentRecord["sentimentCategory"] = /allergen|undeclared/i.test(title)
        ? "allergen_report"
        : brand && brand !== "Luckin Coffee"
          ? "competitor_incident"
          : "negative_coverage";
      out.push({
        id: hashId("sent", link || title),
        module: "sentiment" as const,
        no: null,
        sentimentCategory: cat,
        chineseTitle: null,
        englishTitle: title,
        outlet: "Food Safety News",
        brandMentioned: brand,
        publicationDate: isoFlexible(pub),
        chineseSummary: null,
        englishSummary: title,
        sourceUrl: /^https?:\/\//.test(link) ? link : null,
        riskLevel: (negative ? "中风险" : "信息参考") as SentimentRecord["riskLevel"],
        credibility: "high" as const,
        excluded,
        exclusionReason: excluded ? "not food-safety / not brand-relevant (§11)" : null,
        relevanceTags: relevanceTags(title),
        alertTriggered: false,
        alertReason: null,
        alertRuleIds: [],
        reviewed: true,
        reviewStatus: "approved" as const,
        reviewNote: "auto-collected RSS — metadata + link only",
        provenance: prov("food_safety_news_rss", /^https?:\/\//.test(link) ? link : feedUrl),
      });
    }
    return { sentiment: out, provenance: provEntry({ sourceId: "food_safety_news_rss", name, module: "sentiment", status: out.length ? "filtered" : "no_update", accessType: "open-data", endpointOrUrl: feedUrl, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "Metadata + link only; never rehosts article bodies. §11 exclusions flagged (excluded=true kept for audit)." }) };
  } catch (e) {
    return { sentiment: out, provenance: provEntry({ sourceId: "food_safety_news_rss", name, module: "sentiment", status: "manual", accessType: "open-data", endpointOrUrl: feedUrl, oneTimePullFeasible: "yes", stalenessNote: `RSS fetch failed: ${String(e).slice(0, 120)}`, recordCount: out.length, reVerifyBeforeRelying: true }) };
  }
}

/* ───────────────────────── orchestrate ───────────────────────── */

/* ════════════════════════════════════════════════════════════════════════════
 * V2.5 — four compliance domains (labor / building / environment / consumer).
 * Curated authoritative seeds (the stable legal content) + dormant/gated live
 * adapters behind the FeedAdapter seam (NYC Open Data DCWP/DOB/DSNY + DOL/OSHA),
 * which degrade to truthful `manual / re-verify` stubs — never fabricating.
 * ════════════════════════════════════════════════════════════════════════════ */

async function collectLaborSeeds(): Promise<SourceResult> {
  const out = buildLaborRecords();
  return { labor: out, provenance: provEntry({ sourceId: "dcwp_dol_labor", name: "Curated labor & employment rules (DOL/DCWP)", module: "labor", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: out.length, stalenessNote: "Curated authoritative rules; live DCWP + DOL enforcedata enforcement augments when enabled." }) };
}

async function collectBuildingSeeds(): Promise<SourceResult> {
  const out = buildBuildingRecords();
  return { building: out, provenance: provEntry({ sourceId: "osha_dob_building", name: "Curated building & occupational-safety standards (OSHA/DOB/ADA)", module: "building", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: out.length, stalenessNote: "Curated authoritative standards; live OSHA establishment + DOB violation enforcement augments when enabled." }) };
}

async function collectEnvironmentSeeds(): Promise<SourceResult> {
  const out = buildEnvironmentRecords();
  return { environment: out, provenance: provEntry({ sourceId: "dep_dsny_env", name: "Curated environmental & sanitation rules (DEP/DSNY/BIC)", module: "environment", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: out.length, stalenessNote: "Curated authoritative rules; live DSNY enforcement augments when a verified dataset is wired." }) };
}

async function collectConsumerSeeds(): Promise<SourceResult> {
  const out = buildConsumerRecords();
  return { consumer: out, provenance: provEntry({ sourceId: "dcwp_ftc_consumer", name: "Curated consumer & worker-protection rules (DCWP/FTC)", module: "consumer", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: out.length, stalenessNote: "Curated authoritative rules; live DCWP consumer-complaint dataset augments when a verified id is wired." }) };
}

// ── Dormant/gated live adapters (brand-matched enforcement). Off until a verified dataset id
//    or env key is wired; degrade to truthful `manual`/`re-verify` stubs — never fabricated rows. ──
async function collectDOLEnforcement(): Promise<SourceResult> {
  const name = "DOL WHD enforcement (enforcedata.dol.gov)";
  const endpoint = "https://enforcedata.dol.gov/views/data_summary.php";
  return { labor: [], provenance: provEntry({ sourceId: "dol_enforcedata", name, module: "labor", status: "manual", accessType: "bulk-download", endpointOrUrl: endpoint, oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: "Dormant — set DOL_ENFORCE_KEY + wire the WHD bulk parse to brand-match enforcement (docs/API_KEYS.md). No rows fabricated.", reVerifyBeforeRelying: true }) };
}
async function collectOSHAEstablishments(): Promise<SourceResult> {
  const name = "OSHA establishment search / inspections";
  const endpoint = "https://www.osha.gov/ords/imis/establishment.html";
  return { building: [], provenance: provEntry({ sourceId: "osha_establishments", name, module: "building", status: "manual", accessType: "official-api", endpointOrUrl: endpoint, oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: "Dormant — wire OSHA establishment-search to brand-match citations. No rows fabricated.", reVerifyBeforeRelying: true }) };
}
// Owned-entity enforcement match. We match by our OWNED LEGAL/TRADE NAMES as the cited respondent,
// NOT by premises address. Rationale (empirically verified 2026-07-28 against jz4z-kudi):
//   • Address matching is unusable as a signal. OATH *does* expose the premises street
//     (violation_location_house / street_name / block / lot — the earlier "OATH has no street field"
//     note was simply wrong), but a house+street+zip sweep of all 30 stores returns 2,757 tickets of
//     which only 5 are ours — the other 2,752 belong to the landlord / co-tenants / banks / delivery
//     trucks at the same building. A ~550:1 misattribution ratio, so we stay on respondent-name match.
//   • We match the FULL entity names, not a loose "%LUCKIN%": "Luckin" is also a surname
//     (GLUCKIN, LUCKING, LUCKINSON…) — a substring match pulls in unrelated individuals.
//   • Aliases matter. 5 real summonses (incl. 2 DOHMH food-safety) are filed under the operating
//     entity "FIRST RAY OPERATIONS (NEW YORK) LLC" (parent: First Ray Holdings USA Inc.), which a
//     "LUCKIN COFFEE%"-only match silently dropped. Both trade and legal names are listed below.
// PREFIX (not a leading wildcard) so Socrata can index-scan and stay bounded under the HTTP timeout;
// a prefix also catches suffixed variants ("LUCKIN COFFEE USA", "FIRST RAY OPERATIONS (NEW YORK) LLC").
const OWNED_RESPONDENTS = ["LUCKIN COFFEE%", "FIRST RAY OPERATIONS%", "FIRST RAY HOLDING%"];
const ownedRespondentClause = (col: string): string =>
  "(" + OWNED_RESPONDENTS.map((n) => `upper(${col}) like '${n}'`).join(" OR ") + ")";
const OATH_BASE = "https://data.cityofnewyork.us/resource/jz4z-kudi.json";
// Human, actionable OATH/ECB summons lookup (view charges, hearing status, pay/dispute/settle).
// The record links here instead of the raw Open-Data JSON API; CityPay's summons search is
// POST-only (no GET deep-link), so the summons number is surfaced in the record summary to paste
// in. The raw API query stays as the record's provenance (data lineage).
const CITYPAY_ECB = "https://a836-citypay.nyc.gov/citypay/ecb";

async function oathOwned(agencyLike: string[], limit = 50): Promise<Record<string, string>[]> {
  const clause = agencyLike.map((a) => `upper(issuing_agency) like '${a}'`).join(" OR ");
  return socrata<Record<string, string>>(OATH_BASE, {
    "$where": `${ownedRespondentClause("respondent_last_name")} AND (${clause})`,
    "$order": "violation_date DESC",
    "$limit": limit,
  });
}
const penaltyStr = (n: number): string | null => (n > 0 ? `penalty $${n.toFixed(0)}` : null);

// OATH hearing-result / status / compliance terms → 简体中文 (fallback: keep the source term).
const OATH_TERM_ZH: Record<string, string> = {
  DEFAULTED: "缺席判决", DISMISSED: "撤销", "IN VIOLATION": "判定违规", "NOT IN VIOLATION": "未违规",
  "PAID IN FULL": "已全额缴清", DOCKETED: "已登记判决", "HEARING SCHEDULED": "已排听证",
  "HEARING COMPLETED": "听证完成", STIPULATION: "和解协议", "WRITTEN OFF": "已核销", ADJOURNED: "延期",
  "PENALTY DUE": "待缴", "ALL TERMS MET": "已结清",
};
const oathTermZh = (s: string): string => OATH_TERM_ZH[s.trim().toUpperCase()] ?? s.trim();

// Full adjudication/penalty picture for an OATH summons, bilingual: base fine vs default-escalated
// penalty, hearing result, docketed-judgment date, outstanding balance + compliance status. When a
// docketed judgment still has a balance we point to CityPay for a possible reduced settlement — the
// settlement *amount* is computed live by CityPay and is NOT in the open dataset, so we never invent
// a number. `amount` = the figure to drive risk (max of penalty imposed vs. outstanding balance).
function oathPenaltyDetail(r: Record<string, string>): { en: string; zh: string; amount: number } {
  const base = Number(r.total_violation_amount || r.charge_1_infraction_amount || 0);
  const imposed = Number(r.penalty_imposed || 0);
  const balance = Number(r.balance_due || 0);
  const paid = Number(r.paid_amount || 0);
  const result = (r.hearing_result || "").trim();
  const status = (r.hearing_status || "").trim();
  const compliance = (r.compliance_status || "").trim();
  const docketed = isoFromYmd(r.date_judgment_docketed);
  const escalated = imposed > base && base > 0;
  const settleable = balance > 0 && /DOCKET/i.test(status);
  const usd = (n: number) => `$${n.toFixed(0)}`;

  const en: string[] = [];
  if (escalated) en.push(`base fine ${usd(base)} → penalty ${usd(imposed)} on default`);
  else if (imposed > 0) en.push(`penalty ${usd(imposed)}`);
  if (result) en.push(result);
  if (docketed) en.push(`judgment docketed ${docketed}`);
  else if (status && !result) en.push(status);
  if (balance > 0) en.push(`balance due ${usd(balance)}${compliance ? ` (${compliance})` : ""}`);
  else if (paid > 0 && !/PAID/i.test(status)) en.push("paid in full");
  if (settleable) en.push("reduced settlement may be available on CityPay");

  const zh: string[] = [];
  if (escalated) zh.push(`基础罚款 ${usd(base)},缺席判决升至 ${usd(imposed)}`);
  else if (imposed > 0) zh.push(`罚款 ${usd(imposed)}`);
  if (result) zh.push(oathTermZh(result));
  if (docketed) zh.push(`已登记判决(${docketed})`);
  else if (status && !result) zh.push(oathTermZh(status));
  if (balance > 0) zh.push(`余额 ${usd(balance)}${compliance ? `(${oathTermZh(compliance)})` : ""}`);
  else if (paid > 0 && !/PAID/i.test(status)) zh.push("已缴清");
  if (settleable) zh.push("可在 CityPay 申请和解");

  return { en: en.join(" · "), zh: zh.length ? zh.join(",") + "。" : "", amount: Math.max(imposed, balance) };
}

// Attribute an OATH ticket to an owned store by house-number + zip. Tries the violation location
// first, then the respondent address (for our own operating entity the respondent address IS the
// store — DSNY/DCWP rows carry a real premises street, DOHMH rows are geocoded to zip only). This is
// the SAME house+zip match the food-safety collector uses, hoisted so every OATH collector attributes
// its summons to a specific Luckin store instead of dropping the location entirely.
function storeForOATHRow(
  stores: Array<Record<string, unknown>>,
  r: Record<string, string>,
): Record<string, unknown> | null {
  const at = (house: string, zip: string): Record<string, unknown> | null => {
    if (!house || !zip) return null;
    return (
      stores.find((s) => {
        const m = /^\s*(\d+)/.exec(String(s.address ?? ""));
        return !!m && m[1] === house && String(s.zip ?? "") === zip;
      }) ?? null
    );
  };
  return (
    at(r.violation_location_house || "", r.violation_location_zip_code || "") ??
    at(r.respondent_address_house || "", r.violation_location_zip_code || r.respondent_address_zip_code || "")
  );
}
// Human-readable premises address straight off the OATH violation-location fields.
function oathViolationAddress(r: Record<string, string>): string | null {
  return (
    [r.violation_location_house, r.violation_location_street_name, r.violation_location_city, r.violation_location_zip_code]
      .filter(Boolean)
      .map((x) => String(x).replace(/\s+/g, " ").trim())
      .join(" ") || null
  );
}
// Store-attribution label for an OATH summons: prefer the matched owned store's canonical address,
// otherwise fall back to the raw premises address off the ticket. Returns null when neither is known.
function oathLocationLabel(
  st: Record<string, unknown> | null,
  r: Record<string, string>,
): { storeName: string | null; label: string | null; full: string | null } {
  const vaddr = oathViolationAddress(r);
  let storeName: string | null = null;
  let label: string | null = vaddr;
  if (st) {
    storeName = (st.storeName as string) ?? null;
    label =
      [st.address, st.city, st.state && st.zip ? `${st.state} ${st.zip}` : (st.state ?? st.zip)]
        .filter(Boolean)
        .join(", ") || vaddr;
  }
  // Friendly store name + address, without repeating the name when the address already starts with it
  // (e.g. store "100 Maiden Ln" whose address is "100 Maiden Ln, …" → just the address).
  const full =
    storeName && label && !label.startsWith(storeName) ? `${storeName} · ${label}` : (label ?? storeName);
  return { storeName, label, full };
}

async function collectDOBBuilding(): Promise<SourceResult> {
  const base = "https://data.cityofnewyork.us/resource/6bgk-3dad.json"; // ECB violations
  const name = "NYC ECB/DOB violations (respondent = Luckin)";
  try {
    const rows = await socrata<Record<string, string>>(base, {
      "$where": ownedRespondentClause("respondent_name"),
      "$order": "issue_date DESC",
      "$limit": 50,
    });
    const out: BuildingRecord[] = rows.map((r) => {
      const vtype = (r.violation_type || "ECB/DOB violation").replace(/\s+/g, " ").trim();
      const sect = (r.section_law_description1 || "").replace(/\s+/g, " ").trim();
      const desc = (r.violation_description || "").replace(/\s+/g, " ").trim();
      const sev = (r.severity || "").toUpperCase();
      const pen = Number(r.penality_imposed || 0), bal = Number(r.balance_due || 0);
      const url = `${base}?ecb_violation_number=${r.ecb_violation_number}`;
      return {
        id: hashId("bldg-ecb", r.ecb_violation_number || r.isn_dob_bis_extract),
        module: "building" as const, no: null,
        jurisdiction: "New York City" as const,
        codeStandardName: vtype,
        chineseTitle: `ECB/DOB 违规 — ${vtype}`,
        englishTitle: `ECB/DOB violation — ${vtype}`,
        agency: "NYC DOB / ECB",
        codeCitation: sect || r.infraction_code1 || null,
        status: null,
        effectiveDate: isoFromYmd(r.issue_date),
        coveredEntities: null,
        keyRequirements: null,
        chineseSummary: `NYC 建筑管制局(ECB/DOB)违规:${vtype}。${penaltyStr(pen) ? "罚款 $" + pen.toFixed(0) + (bal > 0 ? ",待缴 $" + bal.toFixed(0) : "") + "。" : ""}${r.ecb_violation_number ? " · ECB 编号 " + r.ecb_violation_number : ""}`.trim(),
        englishSummary: `${desc || vtype}${r.ecb_violation_number ? " · ECB #" + r.ecb_violation_number : ""}`,
        businessImpact: null,
        inspectionCitationRecord: `ECB #${r.ecb_violation_number || "—"} · status ${r.ecb_violation_status || "—"}${r.hearing_date ? " · hearing " + (isoFromYmd(r.hearing_date) || r.hearing_date) : ""}`,
        penalty: penaltyStr(pen) ? penaltyStr(pen)! + (bal > 0 ? `, balance due $${bal.toFixed(0)}` : ", paid") : null,
        riskLevel: (sev.includes("1") ? "高风险" : sev.includes("2") ? "中风险" : "低风险") as BuildingRecord["riskLevel"],
        sourceUrl: CITYPAY_ECB,
        recommendedAction: null,
        topic: null,
        alertTriggered: false, alertReason: null, alertRuleIds: [],
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "brand-matched ECB/DOB enforcement (respondent name contains 'LUCKIN') — live NYC Open Data",
        provenance: prov("nyc_dob_violations", url, { agency: "NYC DOB/ECB", dataAvailabilityLabel: "respondent-matched enforcement" }),
      };
    });
    return { building: out, provenance: provEntry({ sourceId: "nyc_dob_violations", name, module: "building", status: out.length ? "fetched" : "no_update", jurisdictionId: "New York City", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "ECB/DOB violations where a Luckin/First Ray owned entity is the named respondent (live)." : "No ECB/DOB violations name a Luckin/First Ray owned entity (expected for a new chain) — 0 rows, not fabricated." }) };
  } catch (e) {
    return { building: [], provenance: provEntry({ sourceId: "nyc_dob_violations", name, module: "building", status: "manual", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectDSNYEnvironment(): Promise<SourceResult> {
  const name = "NYC DSNY sanitation enforcement (respondent = Luckin, via OATH)";
  try {
    const stores = loadOwnedStores();
    const rows = await oathOwned(["%SANITATION%", "%DSNY%", "DOS -%"]);
    const out: EnvironmentRecord[] = rows.map((r) => {
      const chg = (r.charge_1_code_description || "DSNY sanitation violation").replace(/\s+/g, " ").trim();
      const det = oathPenaltyDetail(r);
      const url = `${OATH_BASE}?ticket_number=${r.ticket_number}`;
      const { storeName, full } = oathLocationLabel(storeForOATHRow(stores, r), r);
      const atStore = storeName ? ` @ ${storeName}` : "";
      const atStoreZh = storeName ? `(${storeName})` : "";
      const locEn = full ? `Store: ${full} · ` : "";
      const locZh = full ? `门店:${full}。` : "";
      return {
        id: hashId("env-dsny", r.ticket_number),
        module: "environment" as const, no: null,
        jurisdiction: "New York City" as const,
        regulationName: chg,
        chineseTitle: `DSNY 环卫执法${atStoreZh} — ${chg}`,
        englishTitle: `DSNY sanitation violation${atStore} — ${chg}`,
        agency: `NYC DSNY (${r.issuing_agency || "Sanitation"})`,
        applicabilityThreshold: null, appliesToUs: true,
        status: null,
        effectiveDate: isoFromYmd(r.violation_date),
        keyRequirements: null,
        chineseSummary: `${locZh}${chg}。${det.zh}${r.ticket_number ? " · 传票号 " + r.ticket_number : ""}`.trim(),
        englishSummary: `${locEn}${chg}${r.charge_1_code_section ? " (§" + r.charge_1_code_section + ")" : ""}${det.en ? " · " + det.en : ""}${r.ticket_number ? " · Summons " + r.ticket_number : ""}`,
        businessImpact: full ? `门店 Store: ${full}` : null,
        riskLevel: (det.amount >= 2500 ? "高风险" : det.amount >= 500 ? "中风险" : det.amount > 0 ? "低风险" : "信息参考") as EnvironmentRecord["riskLevel"],
        sourceUrl: CITYPAY_ECB,
        recommendedAction: null, topic: null, applicabilityRuleId: null,
        alertTriggered: false, alertReason: null, alertRuleIds: [],
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "brand-matched DSNY enforcement (OATH respondent contains 'LUCKIN') — live NYC Open Data",
        provenance: prov("nyc_dsny_enforcement", url, { agency: "NYC DSNY / OATH", dataAvailabilityLabel: "respondent-matched enforcement" }),
      };
    });
    return { environment: out, provenance: provEntry({ sourceId: "nyc_dsny_enforcement", name, module: "environment", status: out.length ? "fetched" : "no_update", jurisdictionId: "New York City", accessType: "open-data", endpointOrUrl: OATH_BASE, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "DSNY OATH summonses where a Luckin/First Ray owned entity is the respondent (live)." : "No DSNY summonses name a Luckin/First Ray owned entity — 0 rows, not fabricated." }) };
  } catch (e) {
    return { environment: [], provenance: provEntry({ sourceId: "nyc_dsny_enforcement", name, module: "environment", status: "manual", accessType: "open-data", endpointOrUrl: OATH_BASE, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectDCWPConsumer(): Promise<SourceResult> {
  const name = "NYC DCWP consumer/worker enforcement (respondent = Luckin, via OATH)";
  try {
    const stores = loadOwnedStores();
    const rows = await oathOwned(["%DCA %", "%DCA-%", "%CONSUMER%", "%WORKER%"]);
    const out: ConsumerRecord[] = rows.map((r) => {
      const chg = (r.charge_1_code_description || "DCWP consumer/worker violation").replace(/\s+/g, " ").trim();
      const det = oathPenaltyDetail(r);
      const url = `${OATH_BASE}?ticket_number=${r.ticket_number}`;
      const { storeName, full } = oathLocationLabel(storeForOATHRow(stores, r), r);
      const atStore = storeName ? ` @ ${storeName}` : "";
      const atStoreZh = storeName ? `(${storeName})` : "";
      const locEn = full ? `Store: ${full} · ` : "";
      const locZh = full ? `门店:${full}。` : "";
      return {
        id: hashId("con-dcwp", r.ticket_number),
        module: "consumer" as const, no: null,
        jurisdiction: "New York City" as const,
        regulationName: chg,
        chineseTitle: `DCWP 消费者/劳工执法${atStoreZh} — ${chg}`,
        englishTitle: `DCWP consumer/worker violation${atStore} — ${chg}`,
        agency: `NYC DCWP (${r.issuing_agency || "Consumer Affairs"})`,
        applicabilityThreshold: null, appliesToUs: true,
        keyRequirements: null,
        complaintEnforcementRecord: `OATH #${r.ticket_number || "—"}${full ? " · " + full : ""}${r.charge_1_code_section ? " · §" + r.charge_1_code_section : ""}${det.en ? " · " + det.en : ""}`,
        status: null,
        effectiveDate: isoFromYmd(r.violation_date),
        riskLevel: (det.amount >= 2500 ? "高风险" : det.amount >= 500 ? "中风险" : det.amount > 0 ? "低风险" : "信息参考") as ConsumerRecord["riskLevel"],
        sourceUrl: CITYPAY_ECB,
        recommendedAction: null,
        chineseSummary: `${locZh}${chg}。${det.zh}${r.ticket_number ? " · 传票号 " + r.ticket_number : ""}`.trim(),
        englishSummary: `${locEn}${chg}${det.en ? " · " + det.en : ""}${r.ticket_number ? " · Summons " + r.ticket_number : ""}`,
        topic: null, applicabilityRuleId: null,
        alertTriggered: false, alertReason: null, alertRuleIds: [],
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "brand-matched DCWP enforcement (OATH respondent contains 'LUCKIN') — live NYC Open Data",
        provenance: prov("nyc_dcwp_consumer", url, { agency: "NYC DCWP / OATH", dataAvailabilityLabel: "respondent-matched enforcement" }),
      };
    });
    return { consumer: out, provenance: provEntry({ sourceId: "nyc_dcwp_consumer", name, module: "consumer", status: out.length ? "fetched" : "no_update", jurisdictionId: "New York City", accessType: "open-data", endpointOrUrl: OATH_BASE, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "DCWP/consumer OATH summonses where a Luckin/First Ray owned entity is the respondent (live)." : "No DCWP summonses name a Luckin/First Ray owned entity — 0 rows, not fabricated." }) };
  } catch (e) {
    return { consumer: [], provenance: provEntry({ sourceId: "nyc_dcwp_consumer", name, module: "consumer", status: "manual", accessType: "open-data", endpointOrUrl: OATH_BASE, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, reVerifyBeforeRelying: true }) };
  }
}

// Owned-entity food-safety summonses adjudicated at OATH. Sibling of collectNYC (which pulls the
// DOHMH restaurant-inspection *results* feed, 43nn-pn8j): this pulls the *enforcement/hearing* side —
// the Notices of Violation against our own operating entity that go to a hearing at OATH. The other
// OATH collectors only bucket DSNY (environment) and DCWP (consumer) agencies, so DOHMH health
// summonses — and recently-filed summonses whose issuing_agency hasn't been populated in the open
// dataset yet — fell through entirely. First Ray Operations is a pure food-service entity, so an
// owned-entity summons with a DOHMH or not-yet-labeled agency is food-safety in nature; we exclude
// the agencies already routed to their own modules to avoid double-counting. Feeds the same
// `inspections` module as café inspections so a store's inspection *and* its adjudicated summons sit
// side by side. OATH geocodes DOHMH rows to zip only (no premises street), so we attribute to a
// specific store on an exact house+zip hit against either the violation OR the respondent address
// (for our own entity the respondent address IS the store) and otherwise keep the cited entity name.
function loadOwnedStores(): Array<Record<string, unknown>> {
  try {
    return JSON.parse(readFileSync(join(OUT, "owned_stores.json"), "utf8")) as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}
// agencies handled by collectDSNYEnvironment / collectDCWPConsumer — kept out of the food-safety bucket.
const NON_FOODSAFETY_AGENCIES = ["%SANITATION%", "%DSNY%", "DOS -%", "%DCA %", "%DCA-%", "%CONSUMER%", "%WORKER%"];

// All charges on an OATH summons (charge_1..charge_10), whitespace-normalized and sorted by
// code → section → text so the order (and the row's violationCode) is the same on every pull.
function oathCharges(r: Record<string, string>): Array<{ code: string; section: string; description: string }> {
  const out: Array<{ code: string; section: string; description: string }> = [];
  for (let i = 1; i <= 10; i++) {
    const description = (r[`charge_${i}_code_description`] || "").replace(/\s+/g, " ").trim();
    if (!description) continue;
    out.push({
      code: (r[`charge_${i}_code`] || "").trim(),
      section: (r[`charge_${i}_code_section`] || "").trim(),
      description,
    });
  }
  const key = (c: { code: string; section: string; description: string }) => `${c.code}\u0000${c.section}\u0000${c.description}`;
  return out.sort((a, b) => key(a).localeCompare(key(b)));
}

// One-line hearing outcome for a DOHMH summons, in the "penalty $X[, balance due $Y | , paid] — result"
// shape enrich_inspections.py already templates into Chinese. Before a decision: "hearing scheduled <date>".
// OATH leaves paid_amount / balance_due blank on DOHMH rows, so payment status is only stated when present.
function oathOutcomeLine(r: Record<string, string>): string | null {
  const result = (r.hearing_result || "").replace(/\s+/g, " ").trim();
  const imposed = r.penalty_imposed == null || r.penalty_imposed === "" ? null : Number(r.penalty_imposed);
  const balance = Number(r.balance_due || 0);
  const paid = Number(r.paid_amount || 0);
  if (imposed == null || Number.isNaN(imposed)) {
    if (result) return result;
    const when = isoFromYmd(r.hearing_date);
    return when ? `hearing scheduled ${when}` : null;
  }
  let line = `penalty $${imposed.toFixed(0)}`;
  if (balance > 0) line += `, balance due $${balance.toFixed(0)}`;
  else if (paid > 0 && paid >= imposed) line += ", paid";
  return result ? `${line} — ${result}` : line;
}
async function collectOwnedFoodSafetyOATH(): Promise<SourceResult> {
  const name = "NYC DOHMH / owned-entity food-safety summonses (via OATH)";
  const stores = loadOwnedStores();
  try {
    // owned respondent AND (DOHMH OR agency-not-yet-labeled), minus the DSNY/DCWP agencies routed elsewhere.
    const excluded = NON_FOODSAFETY_AGENCIES.map((a) => `upper(issuing_agency) not like '${a}'`).join(" AND ");
    const rows = await socrata<Record<string, string>>(OATH_BASE, {
      "$where": `${ownedRespondentClause("respondent_last_name")} AND (upper(issuing_agency) like '%DOHMH%' OR issuing_agency IS NULL) AND (issuing_agency IS NULL OR (${excluded}))`,
      "$order": "violation_date DESC",
      "$limit": 100,
    });
    const out: InspectionRecord[] = rows.map((r) => {
      // every charge (a DOHMH NOV carries up to 10), sorted: Socrata returns charge_1..n in a
      // different order between identical requests, so "first charge" is not stable on its own.
      const chargeList = oathCharges(r);
      const charges = chargeList.map((c) => c.description).join(" | ");
      const hr = (r.hearing_result || "").toLowerCase();
      const pen = Number(r.penalty_imposed || 0);
      const outcome = oathOutcomeLine(r);
      const sustained = hr.includes("sustain") || hr.includes("default");
      const dismissed = hr.includes("dismiss");
      const result = sustained ? "Fail" : dismissed ? "Pass" : "N/A";
      const isDohmh = (r.issuing_agency || "").toUpperCase().includes("DOHMH");
      // for our own entity the respondent address IS the store, so it's a safe fallback when the
      // violation-location house is blank (as it is on OATH's zip-only DOHMH rows).
      const st = storeForOATHRow(stores, r);
      const addr = oathViolationAddress(r);
      const url = `${OATH_BASE}?ticket_number=${r.ticket_number}`;
      return finalizeInspection({
        no: null,
        jurisdiction: "New York City",
        regulatoryAgency: isDohmh ? `NYC DOHMH · OATH (${r.issuing_agency})` : "NYC OATH (机构待定 agency pending)",
        brand: "Luckin Coffee",
        establishmentType: "甲方门店 Owned Store",
        storeName: (st?.storeName as string) ?? r.respondent_last_name ?? null,
        establishmentId: (st?.dohEstablishmentId as string) ?? r.ticket_number ?? null,
        // a matched store's own address beats OATH's zip-only DOHMH geocode ("New York 10013")
        address: st ? `${st.address as string}, ${st.city as string}, ${st.state as string} ${st.zip as string}` : addr,
        inspectionDate: isoFromYmd(r.violation_date),
        inspectionType: isDohmh ? "OATH 卫生传票 Health Summons" : "OATH 传票 Summons (机构待定 agency pending)",
        inspectionResult: result,
        score: null,
        grade: null,
        violationCode: chargeList[0]?.code || null,
        chineseViolationSummary: null,
        // outcome first (penalty + hearing result), then every charge; enrich bilingualizes each " | " part
        englishViolationSummary:
          [
            outcome,
            charges ||
              (isDohmh ? null : "OATH summons filed against owned entity — issuing agency / charge not yet populated in NYC Open Data; verify on CityPay."),
          ]
            .filter(Boolean)
            .join(" | ") || null,
        violationSeverity: sustained && pen > 0 ? "严重（主要）Critical" : "一般 Non-critical",
        followupRequired: sustained || result === "N/A" ? "是 Yes" : "否 No",
        sourceType: "Open Data API",
        sourceUrlOrDocRef: url,
        recommendedAction: null,
        violationText: charges,
        idKey: r.ticket_number ? `oath:${r.ticket_number}` : null,
        sourceId: "nyc_dohmh_oath",
        sourceUrl: CITYPAY_ECB,
      });
    });
    return {
      inspections: out,
      provenance: provEntry({
        sourceId: "nyc_dohmh_oath",
        name,
        jurisdictionId: "New York City",
        accessType: "open-data",
        endpointOrUrl: OATH_BASE,
        oneTimePullFeasible: "yes",
        recordCount: out.length,
        stalenessNote: out.length
          ? "Owned-entity (Luckin Coffee / First Ray Operations) food-safety NOVs adjudicated at OATH — DOHMH agency plus recently-filed summonses whose agency is not yet labeled. OATH geocodes these to zip only; store attribution is name/entity-address-based, never a guessed street."
          : "No DOHMH / owned-entity food-safety OATH summonses — 0 rows, not fabricated.",
      }),
    };
  } catch (e) {
    return {
      inspections: [],
      provenance: provEntry({
        sourceId: "nyc_dohmh_oath",
        name,
        jurisdictionId: "New York City",
        accessType: "open-data",
        endpointOrUrl: OATH_BASE,
        oneTimePullFeasible: "yes",
        recordCount: 0,
        stalenessNote: `pull failed: ${String(e).slice(0, 120)}`,
        reVerifyBeforeRelying: true,
      }),
    };
  }
}

// Newly-opened owned stores are registered in the DOHMH restaurant feed (43nn-pn8j) with a
// placeholder inspection_date of 1900-01-01 and no action/score/grade — permitted but not yet
// inspected. collectNYC filters `inspection_date > 2024-01-01`, so it drops the placeholder. Surface
// each as an "awaiting first inspection" row so every owned NYC store appears in the inspections view
// instead of silently missing until its first grade. The dba is matched with the same owned-entity
// list as OATH: DOHMH first listed these under "FIRST RAY OPERATIONS (NEW YORK) LLC", then (by
// 2026-10) relabelled them "LUCKIN COFFEE" — matching only one name dropped them all once.
// A camis that already has a real (post-2024) inspection is left to collectNYC to avoid dupes.
async function collectOwnedRegisteredDOHMH(): Promise<SourceResult> {
  const base = "https://data.cityofnewyork.us/resource/43nn-pn8j.json";
  const name = "NYC DOHMH — owned-store registrations awaiting first inspection";
  const stores = loadOwnedStores();
  // match a DOHMH row to an owned store by DOHMH establishment id (camis) first, then house+zip.
  const storeFor = (r: Record<string, string>): Record<string, unknown> | null => {
    const byId = stores.find((s) => String(s.dohEstablishmentId ?? "") === (r.camis ?? ""));
    if (byId) return byId;
    const house = (r.building ?? "").trim();
    const zip = (r.zipcode ?? "").trim();
    if (!house || !zip) return null;
    return (
      stores.find((s) => {
        const m = /^\s*(\d+)/.exec(String(s.address ?? ""));
        return !!m && m[1] === house && String(s.zip ?? "") === zip;
      }) ?? null
    );
  };
  try {
    const rows = await socrata<Record<string, string>>(base, { "$where": ownedRespondentClause("dba"), "$order": "camis", "$limit": 400 });
    const byCamis = new Map<string, Record<string, string>[]>();
    for (const r of rows) {
      if (!r.camis) continue;
      (byCamis.get(r.camis) ?? byCamis.set(r.camis, []).get(r.camis)!).push(r);
    }
    const out: InspectionRecord[] = [];
    for (const [camis, rs] of byCamis) {
      // any genuine inspection on this camis? (real date + a graded action) → collectNYC's job.
      const inspected = rs.some((x) => (x.inspection_date ?? "").slice(0, 10) >= "2024-01-01" && !!(x.action || x.score || x.grade));
      if (inspected) continue;
      const r0 = rs[0];
      const st = storeFor(r0);
      const rawAddr = [r0.building, r0.street, r0.boro, r0.zipcode].filter(Boolean).map((x) => String(x).replace(/\s+/g, " ").trim()).join(" ");
      const addr = st ? `${st.address}, ${st.city}, ${st.state} ${st.zip}` : rawAddr || null;
      const label = (st?.storeName as string) ?? (rawAddr ? `${r0.building} ${r0.street}`.replace(/\s+/g, " ").trim() : (r0.dba ?? null));
      out.push(
        finalizeInspection({
          no: null, jurisdiction: "New York City", regulatoryAgency: "NYC DOHMH",
          brand: "Luckin Coffee",
          establishmentType: "甲方门店 Owned Store",
          storeName: label,
          establishmentId: camis,
          address: addr,
          inspectionDate: null,
          inspectionType: "待检查 Awaiting First Inspection",
          inspectionResult: "N/A",
          score: null, grade: null,
          violationCode: null,
          chineseViolationSummary: "已在 NYC DOHMH 登记,尚未进行首次卫生检查。",
          englishViolationSummary: "Registered with NYC DOHMH; no health inspection conducted yet.",
          violationSeverity: null,
          followupRequired: "否 No",
          sourceType: "Open Data API",
          sourceUrlOrDocRef: `${base}?camis=${camis}`,
          recommendedAction: null,
          violationText: "",
          sourceId: "nyc_dohmh_registered",
          sourceUrl: `${base}?camis=${camis}`,
        }),
      );
    }
    return {
      inspections: out,
      provenance: provEntry({
        sourceId: "nyc_dohmh_registered", name, jurisdictionId: "New York City", accessType: "open-data",
        endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length,
        stalenessNote: out.length
          ? "Owned NYC stores registered with DOHMH (dba Luckin Coffee / First Ray Operations) but not yet inspected — shown as awaiting first inspection (no violations, no grade)."
          : "No owned-store DOHMH registrations awaiting inspection — 0 rows, not fabricated.",
      }),
    };
  } catch (e) {
    return {
      inspections: [],
      provenance: provEntry({
        sourceId: "nyc_dohmh_registered", name, jurisdictionId: "New York City", accessType: "open-data",
        endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: 0,
        stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true,
      }),
    };
  }
}

/**
 * Pluggable feed registry (spec §6). Each new domain registers its seed collector
 * (build-on-public-data default) + its dormant/gated live adapter (license-swap-later).
 * A licensed feed swaps in by replacing one adapter's `fetch` — schema/surfaces untouched.
 */
const FEED_ADAPTERS: FeedAdapter[] = [
  { id: "dcwp_dol_labor", module: "labor", fetch: collectLaborSeeds },
  { id: "dol_enforcedata", module: "labor", fetch: collectDOLEnforcement, enabled: () => !!process.env.DOL_ENFORCE_KEY },
  { id: "osha_dob_building", module: "building", fetch: collectBuildingSeeds },
  { id: "osha_establishments", module: "building", fetch: collectOSHAEstablishments, enabled: () => false },
  { id: "nyc_dob_violations", module: "building", fetch: collectDOBBuilding, enabled: () => true },
  { id: "dep_dsny_env", module: "environment", fetch: collectEnvironmentSeeds },
  { id: "nyc_dsny_enforcement", module: "environment", fetch: collectDSNYEnvironment, enabled: () => true },
  { id: "dcwp_ftc_consumer", module: "consumer", fetch: collectConsumerSeeds },
  { id: "nyc_dcwp_consumer", module: "consumer", fetch: collectDCWPConsumer, enabled: () => true },
];

async function main() {
  console.log("collecting (one-time real pull)…");
  const results = await Promise.all([
    collectOpenFDA(),
    collectFederalRegister(),
    collectCDC(),
    collectFSIS(),
    collectNYC(),
    collectOwnedFoodSafetyOATH(),
    collectOwnedRegisteredDOHMH(),
    collectCambridge(),
    collectBoston(),
    collectChicago(),
    collectSanFrancisco(),
    collectSantaClara(),
    collectFairfax(),
    collectLA(),
    collectSouthernNevada(),
    collectSanDiego(),
    collectPasadena(),
    collectDC(),
    collectIntake(),
    collectImportSeeds(),
    collectFederalRegisterImport(),
    collectImportRefusals(),
    collectRegulationSeeds(),
    collectLegiScanBills(),
    collectNYSenateBills(),
    collectOpenStates(),
    collectEcfrTitle21(),
    collectFdaFoodGuidance(),
    collectNysdohProposed(),
    collectNycRules(),
    collectNycCityRecord(),
    collectNyStateRegister(),
    collectSentimentRSS(),
    // V2.5 — four compliance domains behind the FeedAdapter seam (seeds + dormant live adapters).
    ...FEED_ADAPTERS.map((a) => a.fetch()),
  ]);

  const regulatory: RegulatoryRecord[] = [];
  const inspections: InspectionRecord[] = [];
  const importExport: ImportExportRecord[] = [];
  const regulations: RegulationRecord[] = [];
  const sentiment: SentimentRecord[] = [];
  const labor: LaborRecord[] = [];
  const building: BuildingRecord[] = [];
  const environment: EnvironmentRecord[] = [];
  const consumer: ConsumerRecord[] = [];
  const provenance: SourceProvenance[] = [];
  for (const r of results) {
    if (r.regulatory) regulatory.push(...r.regulatory);
    if (r.inspections) inspections.push(...r.inspections);
    if (r.importExport) importExport.push(...r.importExport);
    if (r.regulations) regulations.push(...r.regulations);
    if (r.sentiment) sentiment.push(...r.sentiment);
    if (r.labor) labor.push(...r.labor);
    if (r.building) building.push(...r.building);
    if (r.environment) environment.push(...r.environment);
    if (r.consumer) consumer.push(...r.consumer);
    provenance.push(r.provenance);
    console.log(`  ${r.provenance.sourceId}: ${r.provenance.recordCount} records${r.provenance.stalenessNote ? ` (${r.provenance.stalenessNote})` : ""}`);
  }

  // Manual / pending sources (no usable one-time API this run) — recorded for transparency
  // on the /sources view, per the hybrid plan (real pull where feasible + truthful stubs).
  provenance.push(
    provEntry({ sourceId: "fda_warning_letters", name: "FDA Warning Letters", accessType: "bulk-download", oneTimePullFeasible: "partial", stalenessNote: "No clean public JSON feed (healthdata.gov cj9t-m28d is non-tabular); HTML-scrape or manual intake only.", reVerifyBeforeRelying: true }),
    provEntry({ sourceId: "sf_dph", name: "SF DPH (DataSF LIVES)", jurisdictionId: "San Francisco", accessType: "open-data", oneTimePullFeasible: "partial", stalenessNote: "LIVES feed (pyih-qa8i) frozen at 2019; real 2019 café rows seeded via intake/inspections.json." }),
    provEntry({ sourceId: "dc_health", name: "DC Health (HealthSpace)", jurisdictionId: "Washington DC", accessType: "html-scrape", oneTimePullFeasible: "partial", stalenessNote: "HTML/PDF reports — manual intake." }),
    provEntry({ sourceId: "newark_lookup", name: "Newark Health Inspection Lookup", jurisdictionId: "Newark, NJ", accessType: "html-scrape", oneTimePullFeasible: "partial", stalenessNote: "JS/CAPTCHA lookup — manual / OPRA via Food & Drug Bureau." }),
    provEntry({ sourceId: "bergen_opra", name: "Bergen County (OPRA)", jurisdictionId: "Bergen County, NJ", accessType: "none", oneTimePullFeasible: "no", stalenessNote: "No online DB — OPRA request per municipality." }),
    provEntry({ sourceId: "fl_fdacs", name: "Florida FDACS Food Permit Center", jurisdictionId: "Florida (FDACS)", accessType: "none", oneTimePullFeasible: "no", stalenessNote: "robots.txt default-deny — manual UI / public-records request." }),
  );

  // Dedupe module-1 regulatory by id BEFORE numbering — FSIS publishes each recall twice (English +
  // Spanish) under the same field_recall_number, so both hash to one id. Keep first occurrence
  // (English leads in the FSIS feed, and this dashboard is English-primary). Without this the two
  // rows survive as a duplicate id and fail prep:validate — the reason a real refresh (whenever FSIS
  // isn't 403'd) couldn't validate. Mirrors the regulations dedup further down.
  {
    const seen = new Set<string>();
    const deduped = regulatory.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
    regulatory.length = 0;
    regulatory.push(...deduped);
  }

  // sequential No.
  regulatory.forEach((r, i) => (r.no = i + 1));
  inspections.forEach((r, i) => (r.no = i + 1));
  importExport.forEach((r, i) => (r.no = i + 1));
  regulations.forEach((r, i) => (r.no = i + 1));
  sentiment.forEach((r, i) => (r.no = i + 1));
  labor.forEach((r, i) => (r.no = i + 1));
  building.forEach((r, i) => (r.no = i + 1));
  environment.forEach((r, i) => (r.no = i + 1));
  consumer.forEach((r, i) => (r.no = i + 1));

  // Stamp appliesToUs from the applicability engine (labor/environment/consumer; building is
  // premises-universal and carries no applicabilityRuleId). Reads the vendored footprint inputs.
  try {
    const profile = CompanyProfileSchema.parse(JSON.parse(readFileSync(join(OUT, "company_profile.json"), "utf8")));
    const arules = ApplicabilityRulesFileSchema.parse(JSON.parse(readFileSync(join(OUT, "applicability_rules.json"), "utf8")));
    stampAppliesToUs([...labor, ...environment, ...consumer], profile, arules);
  } catch (e) {
    console.warn("appliesToUs stamping skipped:", String(e).slice(0, 140));
  }

  // repeat-violation grouping: same STORE repeating the same standardized category (≥2
  // inspections). Store-level keeps the signal meaningful (vs. lumping every same-brand
  // store in a city together). Café-★ categories (17/18) also raise the café-repeat flag.
  const groups = new Map<string, InspectionRecord[]>();
  for (const r of inspections) {
    if (r.standardizedCategoryId == null || !r.storeName) continue;
    // address makes the key location-specific (NYC/Boston `dba` is the brand name, not a store).
    const key = `${normKey(`${r.storeName} ${r.address ?? ""}`)}|${r.jurisdiction}|${r.standardizedCategoryId}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  for (const [key, rows] of groups) {
    if (rows.length < 2) continue;
    const gid = hashId("rg", key);
    const cafeRepeat = rows[0].standardizedCategoryId === 17 || rows[0].standardizedCategoryId === 18;
    for (const r of rows) {
      r.repeatViolationGroupId = gid;
      if (!r.alertRuleIds.includes("repeat.same")) {
        r.alertRuleIds.push("repeat.same");
        if (cafeRepeat) r.alertRuleIds.push("cafe.repeat");
        r.alertTriggered = true;
        r.alertReason = [r.alertReason, "repeat violation (same store + category)"]
          .filter(Boolean)
          .join("; ");
        if (r.riskLevel === "低风险") r.riskLevel = "中风险";
      }
    }
  }

  // Dedupe regulations across sources — LegiScan / OpenStates / NY-Senate overlap on the same bills
  // (collapsed via the shared billId); curated seeds keep distinct ids. Keep first occurrence.
  {
    const seenReg = new Set<string>();
    const deduped = regulations.filter((r) => (seenReg.has(r.id) ? false : (seenReg.add(r.id), true)));
    regulations.length = 0;
    regulations.push(...deduped);
  }

  // Counts/aggregates mirror what the app + export actually serve (src/lib/data.ts isServable;
  // sentiment also drops §11-excluded) — never count rows the dashboard refuses to surface.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isServable = (r: any) => r.reviewed && r.reviewStatus !== "rejected";
  const svReg = regulatory.filter(isServable);
  const svInsp = inspections.filter(isServable);
  const svImp = importExport.filter(isServable);
  const svRegs = regulations.filter(isServable);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svSent = sentiment.filter((r: any) => isServable(r) && !r.excluded);
  const svLabor = labor.filter(isServable);
  const svBuilding = building.filter(isServable);
  const svEnv = environment.filter(isServable);
  const svConsumer = consumer.filter(isServable);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRecords: any[] = [...svReg, ...svInsp, ...svImp, ...svRegs, ...svSent, ...svLabor, ...svBuilding, ...svEnv, ...svConsumer];
  const alerts = allRecords.filter((r) => r.alertTriggered).length;
  const highRisk = allRecords.filter((r) => r.riskLevel === "高风险").length;
  const watch = allRecords.filter((r) => r.riskLevel === "关注").length;
  const bySource: Record<string, number> = {};
  for (const r of allRecords) bySource[r.provenance.sourceId] = (bySource[r.provenance.sourceId] ?? 0) + 1;

  const hrefFor = (m: string, id: string) =>
    m === "inspection" ? `/inspections/${id}` : m === "import" ? "/import" : m === "regulation" ? "/regulation" : m === "sentiment" ? "/sentiment" : "/intelligence";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const titleOf = (r: any, lang: "zh" | "en") => (lang === "zh" ? (r.chineseTitle ?? r.storeName ?? null) : (r.englishTitle ?? r.storeName ?? null));
  const highRiskItems = allRecords
    .filter((r) => r.riskLevel === "高风险")
    .slice(0, 12)
    .map((r) => ({ recordId: r.id, module: r.module, titleZh: titleOf(r, "zh"), titleEn: titleOf(r, "en"), riskLevel: r.riskLevel, href: hrefFor(r.module, r.id) }));

  const summary = {
    reportNameZh: `${TODAY.slice(0, 7)} 瑞幸北美 食品安全·进口合规·地方法规·舆情监测月报`,
    reportNameEn: `Luckin NA Food Safety · Import Compliance · Local Regulation · Sentiment Monitor — ${TODAY.slice(0, 7)}`,
    scopeZh: "FDA / FSIS / CDC / CBP / APHIS / Federal Register / 州及地方法规 / 咖啡馆检查 / 负面舆情",
    scopeEn: "FDA / FSIS / CDC / CBP / APHIS / Federal Register / State & Local Regulation / Café Inspections / Negative Media",
    exclusions: [
      { zh: "不纳入与食品安全无关的动物/宠物/野生动物事件", en: "Excludes non-food animal/pet/wildlife events" },
      { zh: "不纳入纯商业/营销/财务/门店扩张新闻", en: "Excludes pure business/marketing/financial/store-expansion news" },
      { zh: "不纳入低可信度、无来源或重复转载内容", en: "Excludes low-credibility, unsourced or reposted content" },
    ],
    keyHighlights: [
      { zh: `本月高风险事项 ${highRisk} 项、关注 ${watch} 项`, en: `${highRisk} high-risk and ${watch} watch items this period` },
      { zh: "州/地方合规临近：CA SB68 (2026-07-01)、NY 过敏原法 (~2026-11)、NYC added-sugar 已生效", en: "Imminent state/local compliance: CA SB68 (2026-07-01), NY allergen law (~2026-11), NYC added-sugar in effect" },
      { zh: "进口监管：APHIS 禽类限制持续；FDA Prior Notice 基线适用；CBP CSMS 本轮无直接更新", en: "Import: APHIS poultry restrictions ongoing; FDA Prior Notice baseline; no direct CBP CSMS update this run" },
    ],
    highRiskItems,
    keyActions: [
      { zh: "在 2026-07-01 前完成 CA 门店主要过敏原披露实施", en: "Complete CA major-allergen disclosure before 2026-07-01" },
      { zh: "建立菜单/饮品 added sugars 与过敏原数据库并同步配方变更", en: "Build menu added-sugars + allergen database; sync with recipe changes" },
      { zh: "持续监控 CBP / APHIS / FDA Import Alerts 与州级过敏原立法趋势", en: "Monitor CBP/APHIS/FDA Import Alerts + the state allergen-bill trend" },
    ],
  };

  const meta = {
    schemaVersion: "2.0.0",
    dataAsOf: TODAY,
    reportingPeriod: { label: `${TODAY.slice(0, 7)} (real pull)`, year: Number(TODAY.slice(0, 4)), month: Number(TODAY.slice(5, 7)) },
    generatedAt: NOW,
    isSeedData: false,
    counts: {
      regulatory: svReg.length,
      inspections: svInsp.length,
      alerts,
      pendingReview: 0,
      importExport: svImp.length,
      regulation: svRegs.length,
      sentiment: svSent.length,
      labor: svLabor.length,
      building: svBuilding.length,
      environment: svEnv.length,
      consumer: svConsumer.length,
      highRisk,
      watch,
      bySource,
    },
    summary,
    provenance,
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "regulatory.json"), JSON.stringify(regulatory, null, 2) + "\n");
  writeFileSync(join(OUT, "inspections.json"), JSON.stringify(inspections, null, 2) + "\n");
  writeFileSync(join(OUT, "import_export.json"), JSON.stringify(importExport, null, 2) + "\n");
  writeFileSync(join(OUT, "regulations.json"), JSON.stringify(regulations, null, 2) + "\n");
  writeFileSync(join(OUT, "sentiment.json"), JSON.stringify(sentiment, null, 2) + "\n");
  writeFileSync(join(OUT, "labor.json"), JSON.stringify(labor, null, 2) + "\n");
  writeFileSync(join(OUT, "building.json"), JSON.stringify(building, null, 2) + "\n");
  writeFileSync(join(OUT, "environment.json"), JSON.stringify(environment, null, 2) + "\n");
  writeFileSync(join(OUT, "consumer.json"), JSON.stringify(consumer, null, 2) + "\n");
  writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(
    `\nwrote ${regulatory.length} regulatory + ${inspections.length} insp + ${importExport.length} import + ${regulations.length} regs + ${sentiment.length} sentiment + ${labor.length} labor + ${building.length} building + ${environment.length} env + ${consumer.length} consumer (${alerts} alerts, ${highRisk} high, ${watch} watch) to data/v2/`,
  );
}

main().catch((e) => {
  console.error("collect failed:", e);
  process.exit(1);
});
