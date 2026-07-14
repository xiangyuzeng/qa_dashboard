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
import { getJson, getText, postJson, socrata } from "./lib/http";
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
    id: hashId("insp", p.jurisdiction, p.establishmentId ?? p.storeName, p.inspectionDate, p.violationCode ?? cls.label ?? ""),
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

async function collectCambridge(): Promise<SourceResult> {
  const base = "https://data.cambridgema.gov/resource/ryb9-qzmw.json";
  const name = "Cambridge Sanitary Inspections";
  try {
    const rows = await socrata<Record<string, string>>(base, { "$order": ":id", "$limit": 2000 });
    const nameKey = ["businessname", "business_name", "name", "establishment", "dba"].find((k) => rows[0] && k in rows[0]) ?? "businessname";
    const violKey = ["violation_description", "violationdesc", "description", "violation"].find((k) => rows[0] && k in rows[0]) ?? "violation_description";
    const dateKey = ["inspection_date", "date", "inspectiondate"].find((k) => rows[0] && k in rows[0]) ?? "inspection_date";
    const resultKey = ["result", "inspection_result", "status"].find((k) => rows[0] && k in rows[0]) ?? "result";
    const out: InspectionRecord[] = [];
    for (const r of rows) {
      const nm = r[nameKey];
      if (!inScope(nm)) continue;
      const violText = r[violKey] ?? "";
      const rawResult = (r[resultKey] ?? "").toLowerCase();
      const result = rawResult.includes("fail") ? "Fail" : rawResult.includes("pass") ? "Pass" : "N/A";
      if (!violText && result === "N/A") continue; // skip permit-only rows with no inspection signal
      out.push(
        finalizeInspection({
          no: null, jurisdiction: "Cambridge", regulatoryAgency: "Cambridge Inspectional Services",
          brand: brandOrOther(nm) as InspectionRecord["brand"],
          establishmentType: establishmentType(nm) as InspectionRecord["establishmentType"],
          storeName: nm ?? null, address: r.address ?? r.location ?? null,
          inspectionDate: isoFromYmd(r[dateKey]),
          inspectionType: r.type ?? null,
          inspectionResult: result as InspectionRecord["inspectionResult"],
          score: null, grade: null, violationCode: r.code ?? null,
          chineseViolationSummary: null, englishViolationSummary: violText.slice(0, 400) || null,
          violationSeverity: violText ? "一般 Non-critical" : null,
          followupRequired: result === "Fail" ? "是 Yes" : "否 No",
          sourceType: "Open Data API",
          sourceUrlOrDocRef: base, recommendedAction: null,
          violationText: violText, sourceId: "cambridge_socrata", sourceUrl: base,
        }),
      );
      if (out.length >= 80) break;
    }
    const note = out.length === 0
      ? "ryb9-qzmw is a permit-cases dataset (no violation/result fields) — needs the correct Cambridge sanitary-inspections resource or manual intake"
      : null;
    return { inspections: out, provenance: provEntry({ sourceId: "cambridge_socrata", name, jurisdictionId: "Cambridge", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: out.length ? "yes" : "partial", recordCount: out.length, stalenessNote: note, reVerifyBeforeRelying: out.length === 0 }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "cambridge_socrata", name, jurisdictionId: "Cambridge", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", stalenessNote: `pull failed: ${String(e).slice(0, 140)}`, reVerifyBeforeRelying: true }) };
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

/* ─────────────── MANUAL INTAKE (DC / Newark / Bergen / FL / SF / offline) ─────────────── */

// Reads intake/inspections.json (manually-collected via OPRA / web lookup / PDF / email).
// Lets QA represent no-API jurisdictions truthfully (incl. NJ 'not_public_online') without
// fabricating. See intake/README.md + intake/inspections.example.json.
// LA County restaurant inspection GRADES (ArcGIS, no auth). Recency-gated: if the dataset is stale
// (newest inspection older than ~18 months), emit a truthful stub rather than ship old grades (cf. SF).
async function collectLA(): Promise<SourceResult> {
  const name = "LA County Environmental Health (ArcGIS grades)";
  const base = "https://services1.arcgis.com/JXBurs0uwQlwOiHt/arcgis/rest/services/Restaurant_Inspection_Grades/FeatureServer/0/query";
  const url = `${base}?where=1%3D1&outFields=facilityname,Address,City,Zip,InspectionDate,7score&orderByFields=InspectionDate%20DESC&resultRecordCount=2000&f=json`;
  try {
    const res = await getJson<{ features?: { attributes: Record<string, unknown> }[] }>(url);
    const feats = res.features ?? [];
    const newest = feats.length ? Math.max(...feats.map((f) => Number(f.attributes?.InspectionDate ?? 0))) : 0;
    const cutoff = Date.parse(TODAY) - 550 * 86400000; // ~18 months
    if (!feats.length || newest < cutoff) {
      const newestStr = newest ? new Date(newest).toISOString().slice(0, 10) : "n/a";
      return { inspections: [], provenance: provEntry({ sourceId: "la_county_arcgis", name, jurisdictionId: "Los Angeles County", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: `ArcGIS grades dataset is stale (newest ${newestStr}) — no current LA County feed; manual export needed. No stale rows shipped.`, reVerifyBeforeRelying: true }) };
    }
    const out: InspectionRecord[] = [];
    for (const f of feats) {
      const a = f.attributes;
      const nm = String(a.facilityname ?? "");
      if (!inScope(nm)) continue;
      const score = a["7score"] != null ? Number(a["7score"]) : null;
      const ts = Number(a.InspectionDate ?? 0);
      out.push(
        finalizeInspection({
          no: null, jurisdiction: "Los Angeles County", regulatoryAgency: "LA County Public Health",
          brand: brandOrOther(nm) as InspectionRecord["brand"],
          establishmentType: establishmentType(nm) as InspectionRecord["establishmentType"],
          storeName: nm || null,
          address: [a.Address, a.City, a.Zip].filter(Boolean).join(", ") || null,
          inspectionDate: ts ? new Date(ts).toISOString().slice(0, 10) : null,
          inspectionType: "Routine",
          inspectionResult: (score == null ? "N/A" : score >= 90 ? "Pass" : score >= 80 ? "Conditional Pass" : "Fail") as InspectionRecord["inspectionResult"],
          score, grade: null, violationCode: null,
          chineseViolationSummary: null, englishViolationSummary: null,
          violationSeverity: (score != null && score < 80 ? "严重（主要）Critical" : "一般 Non-critical") as InspectionRecord["violationSeverity"],
          followupRequired: (score != null && score < 80 ? "是 Yes" : "否 No") as InspectionRecord["followupRequired"],
          sourceType: "Open Data API", sourceUrlOrDocRef: base, recommendedAction: null,
          violationText: "", sourceId: "la_county_arcgis", sourceUrl: base,
        }),
      );
      if (out.length >= 80) break;
    }
    return { inspections: out, provenance: provEntry({ sourceId: "la_county_arcgis", name, jurisdictionId: "Los Angeles County", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "Grades only (no per-violation detail); café/priority-brand scope." }) };
  } catch (e) {
    return { inspections: [], provenance: provEntry({ sourceId: "la_county_arcgis", name, jurisdictionId: "Los Angeles County", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "partial", stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, recordCount: 0, reVerifyBeforeRelying: true }) };
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
const LEGISCAN_STATUS: Record<number, RegulationRecord["status"]> = {
  1: "Proposed", 2: "Proposed", 3: "Passed", 4: "In effect", 5: "Repealed", 6: "Repealed",
};
const NY_STATUS: Record<string, RegulationRecord["status"]> = {
  INTRODUCED: "Proposed", IN_SENATE_COMM: "Proposed", IN_ASSEMBLY_COMM: "Proposed",
  PASSED_SENATE: "Passed", PASSED_ASSEMBLY: "Passed", DELIVERED_TO_GOV: "Passed",
  SIGNED_BY_GOV: "In effect", ADOPTED: "In effect", VETOED: "Repealed",
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
// Owned-brand enforcement match. We match by the FULL BUSINESS NAME "LUCKIN COFFEE", NOT a raw
// premises address and NOT a loose "%LUCKIN%". Two reasons: (1) OATH exposes no street field
// (only house + borough + zip), so an address match would misattribute a landlord's/neighbour's
// violation to us; (2) "Luckin" is also a human surname — a loose match catches individuals
// (GLUCKIN, LUCKING, LUCKINSON…). The full-name match surfaces only summonses where the company
// is the cited respondent — truthful, zero misattribution. (Verified: 5 real DSNY summonses in
// the store zips 10003/10038; ECB building = 0, correctly.)
// PREFIX (not a leading wildcard) so Socrata can use an index and the scan stays fast/bounded under
// the HTTP timeout — the respondent value is "LUCKIN COFFEE"; a prefix also catches "LUCKIN COFFEE USA".
const OWNED_RESPONDENT = "LUCKIN COFFEE%";
const OATH_BASE = "https://data.cityofnewyork.us/resource/jz4z-kudi.json";

async function oathOwned(agencyLike: string[], limit = 50): Promise<Record<string, string>[]> {
  const clause = agencyLike.map((a) => `upper(issuing_agency) like '${a}'`).join(" OR ");
  return socrata<Record<string, string>>(OATH_BASE, {
    "$where": `upper(respondent_last_name) like '${OWNED_RESPONDENT}' AND (${clause})`,
    "$order": "violation_date DESC",
    "$limit": limit,
  });
}
const penaltyStr = (n: number): string | null => (n > 0 ? `penalty $${n.toFixed(0)}` : null);

async function collectDOBBuilding(): Promise<SourceResult> {
  const base = "https://data.cityofnewyork.us/resource/6bgk-3dad.json"; // ECB violations
  const name = "NYC ECB/DOB violations (respondent = Luckin)";
  try {
    const rows = await socrata<Record<string, string>>(base, {
      "$where": `upper(respondent_name) like '${OWNED_RESPONDENT}'`,
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
        chineseSummary: `NYC 建筑管制局(ECB/DOB)违规:${vtype}。${penaltyStr(pen) ? "罚款 $" + pen.toFixed(0) + (bal > 0 ? ",待缴 $" + bal.toFixed(0) : "") + "。" : ""}`.trim(),
        englishSummary: desc || vtype,
        businessImpact: null,
        inspectionCitationRecord: `ECB #${r.ecb_violation_number || "—"} · status ${r.ecb_violation_status || "—"}${r.hearing_date ? " · hearing " + (isoFromYmd(r.hearing_date) || r.hearing_date) : ""}`,
        penalty: penaltyStr(pen) ? penaltyStr(pen)! + (bal > 0 ? `, balance due $${bal.toFixed(0)}` : ", paid") : null,
        riskLevel: (sev.includes("1") ? "高风险" : sev.includes("2") ? "中风险" : "低风险") as BuildingRecord["riskLevel"],
        sourceUrl: url,
        recommendedAction: null,
        topic: null,
        alertTriggered: false, alertReason: null, alertRuleIds: [],
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "brand-matched ECB/DOB enforcement (respondent name contains 'LUCKIN') — live NYC Open Data",
        provenance: prov("nyc_dob_violations", url, { agency: "NYC DOB/ECB", dataAvailabilityLabel: "respondent-matched enforcement" }),
      };
    });
    return { building: out, provenance: provEntry({ sourceId: "nyc_dob_violations", name, module: "building", status: out.length ? "fetched" : "no_update", jurisdictionId: "New York City", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "ECB/DOB violations where 'LUCKIN' is the named respondent (live)." : "No ECB/DOB violations name Luckin as respondent (expected for a new chain) — 0 rows, not fabricated." }) };
  } catch (e) {
    return { building: [], provenance: provEntry({ sourceId: "nyc_dob_violations", name, module: "building", status: "manual", accessType: "open-data", endpointOrUrl: base, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectDSNYEnvironment(): Promise<SourceResult> {
  const name = "NYC DSNY sanitation enforcement (respondent = Luckin, via OATH)";
  try {
    const rows = await oathOwned(["%SANITATION%", "%DSNY%", "DOS -%"]);
    const out: EnvironmentRecord[] = rows.map((r) => {
      const chg = (r.charge_1_code_description || "DSNY sanitation violation").replace(/\s+/g, " ").trim();
      const pen = Number(r.penalty_imposed || 0);
      const url = `${OATH_BASE}?ticket_number=${r.ticket_number}`;
      return {
        id: hashId("env-dsny", r.ticket_number),
        module: "environment" as const, no: null,
        jurisdiction: "New York City" as const,
        regulationName: chg,
        chineseTitle: `DSNY 环卫执法 — ${chg}`,
        englishTitle: `DSNY sanitation violation — ${chg}`,
        agency: `NYC DSNY (${r.issuing_agency || "Sanitation"})`,
        applicabilityThreshold: null, appliesToUs: true,
        status: null,
        effectiveDate: isoFromYmd(r.violation_date),
        keyRequirements: null,
        chineseSummary: `${chg}。${pen > 0 ? "罚款 $" + pen.toFixed(0) + "。" : ""}${r.hearing_result ? "听证结果:" + r.hearing_result + "。" : ""}`.trim(),
        englishSummary: `${chg}${r.charge_1_code_section ? " (§" + r.charge_1_code_section + ")" : ""}${pen > 0 ? " · penalty $" + pen.toFixed(0) : ""}${r.hearing_result ? " · " + r.hearing_result : ""}`,
        businessImpact: null,
        riskLevel: (pen >= 2500 ? "高风险" : pen >= 500 ? "中风险" : pen > 0 ? "低风险" : "信息参考") as EnvironmentRecord["riskLevel"],
        sourceUrl: url,
        recommendedAction: null, topic: null, applicabilityRuleId: null,
        alertTriggered: false, alertReason: null, alertRuleIds: [],
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "brand-matched DSNY enforcement (OATH respondent contains 'LUCKIN') — live NYC Open Data",
        provenance: prov("nyc_dsny_enforcement", url, { agency: "NYC DSNY / OATH", dataAvailabilityLabel: "respondent-matched enforcement" }),
      };
    });
    return { environment: out, provenance: provEntry({ sourceId: "nyc_dsny_enforcement", name, module: "environment", status: out.length ? "fetched" : "no_update", jurisdictionId: "New York City", accessType: "open-data", endpointOrUrl: OATH_BASE, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "DSNY OATH summonses where 'LUCKIN' is the respondent (live)." : "No DSNY summonses name Luckin as respondent (expected) — 0 rows, not fabricated." }) };
  } catch (e) {
    return { environment: [], provenance: provEntry({ sourceId: "nyc_dsny_enforcement", name, module: "environment", status: "manual", accessType: "open-data", endpointOrUrl: OATH_BASE, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, reVerifyBeforeRelying: true }) };
  }
}

async function collectDCWPConsumer(): Promise<SourceResult> {
  const name = "NYC DCWP consumer/worker enforcement (respondent = Luckin, via OATH)";
  try {
    const rows = await oathOwned(["%DCA %", "%DCA-%", "%CONSUMER%", "%WORKER%"]);
    const out: ConsumerRecord[] = rows.map((r) => {
      const chg = (r.charge_1_code_description || "DCWP consumer/worker violation").replace(/\s+/g, " ").trim();
      const pen = Number(r.penalty_imposed || 0);
      const url = `${OATH_BASE}?ticket_number=${r.ticket_number}`;
      return {
        id: hashId("con-dcwp", r.ticket_number),
        module: "consumer" as const, no: null,
        jurisdiction: "New York City" as const,
        regulationName: chg,
        chineseTitle: `DCWP 消费者/劳工执法 — ${chg}`,
        englishTitle: `DCWP consumer/worker violation — ${chg}`,
        agency: `NYC DCWP (${r.issuing_agency || "Consumer Affairs"})`,
        applicabilityThreshold: null, appliesToUs: true,
        keyRequirements: null,
        complaintEnforcementRecord: `OATH #${r.ticket_number || "—"}${r.charge_1_code_section ? " · §" + r.charge_1_code_section : ""}${pen > 0 ? " · penalty $" + pen.toFixed(0) : ""}${r.hearing_result ? " · " + r.hearing_result : ""}`,
        status: null,
        effectiveDate: isoFromYmd(r.violation_date),
        riskLevel: (pen >= 2500 ? "高风险" : pen >= 500 ? "中风险" : pen > 0 ? "低风险" : "信息参考") as ConsumerRecord["riskLevel"],
        sourceUrl: url,
        recommendedAction: null,
        chineseSummary: `${chg}。${pen > 0 ? "罚款 $" + pen.toFixed(0) + "。" : ""}${r.hearing_result ? "听证结果:" + r.hearing_result + "。" : ""}`.trim(),
        englishSummary: `${chg}${pen > 0 ? " · penalty $" + pen.toFixed(0) : ""}${r.hearing_result ? " · " + r.hearing_result : ""}`,
        topic: null, applicabilityRuleId: null,
        alertTriggered: false, alertReason: null, alertRuleIds: [],
        reviewed: true, reviewStatus: "approved" as const,
        reviewNote: "brand-matched DCWP enforcement (OATH respondent contains 'LUCKIN') — live NYC Open Data",
        provenance: prov("nyc_dcwp_consumer", url, { agency: "NYC DCWP / OATH", dataAvailabilityLabel: "respondent-matched enforcement" }),
      };
    });
    return { consumer: out, provenance: provEntry({ sourceId: "nyc_dcwp_consumer", name, module: "consumer", status: out.length ? "fetched" : "no_update", jurisdictionId: "New York City", accessType: "open-data", endpointOrUrl: OATH_BASE, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: out.length ? "DCWP/consumer OATH summonses where 'LUCKIN' is the respondent (live)." : "No DCWP summonses name Luckin as respondent (expected) — 0 rows, not fabricated." }) };
  } catch (e) {
    return { consumer: [], provenance: provEntry({ sourceId: "nyc_dcwp_consumer", name, module: "consumer", status: "manual", accessType: "open-data", endpointOrUrl: OATH_BASE, oneTimePullFeasible: "yes", recordCount: 0, stalenessNote: `pull failed: ${String(e).slice(0, 120)}`, reVerifyBeforeRelying: true }) };
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
    collectCambridge(),
    collectBoston(),
    collectLA(),
    collectIntake(),
    collectImportSeeds(),
    collectFederalRegisterImport(),
    collectImportRefusals(),
    collectRegulationSeeds(),
    collectLegiScanBills(),
    collectNYSenateBills(),
    collectOpenStates(),
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
