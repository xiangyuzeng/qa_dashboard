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
import { getJson, socrata } from "./lib/http";
import { matchBrand, brandOrOther, establishmentType, inScope } from "./lib/match";
import { classify } from "./lib/classify";
import { assessInspection, assessRegulatory } from "./lib/risk";
import { hashId, normKey } from "./lib/ids";
import type {
  RegulatoryRecord,
  InspectionRecord,
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

type SourceResult = { regulatory?: RegulatoryRecord[]; inspections?: InspectionRecord[]; provenance: SourceProvenance };

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
  const iso = isoFromYmd(s);
  if (iso) return iso;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
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
      if (!tags.length) continue; // keep only café-relevant (dairy/allergen/labeling/packaging)
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
    return { regulatory: out, provenance: provEntry({ sourceId: "fsis_recall", name, accessType: "official-api", endpointOrUrl: url, oneTimePullFeasible: "yes", recordCount: out.length, stalenessNote: "Mostly meat/poultry; only café-relevant (dairy/allergen/labeling) items kept." }) };
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

/* ───────────────────────── orchestrate ───────────────────────── */

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
    collectIntake(),
  ]);

  const regulatory: RegulatoryRecord[] = [];
  const inspections: InspectionRecord[] = [];
  const provenance: SourceProvenance[] = [];
  for (const r of results) {
    if (r.regulatory) regulatory.push(...r.regulatory);
    if (r.inspections) inspections.push(...r.inspections);
    provenance.push(r.provenance);
    console.log(`  ${r.provenance.sourceId}: ${r.provenance.recordCount} records${r.provenance.stalenessNote ? ` (${r.provenance.stalenessNote})` : ""}`);
  }

  // Manual / pending sources (no usable one-time API this run) — recorded for transparency
  // on the /sources view, per the hybrid plan (real pull where feasible + truthful stubs).
  provenance.push(
    provEntry({ sourceId: "fda_warning_letters", name: "FDA Warning Letters", accessType: "bulk-download", oneTimePullFeasible: "partial", stalenessNote: "Bulk XML/CSV — URL needs re-verification; manual intake this run.", reVerifyBeforeRelying: true }),
    provEntry({ sourceId: "la_county_arcgis", name: "LA County Environmental Health (ArcGIS)", jurisdictionId: "Los Angeles County", accessType: "bulk-download", oneTimePullFeasible: "yes", stalenessNote: "Large ArcGIS CSV — not pulled this run; needs column mapping or manual export.", reVerifyBeforeRelying: true }),
    provEntry({ sourceId: "sf_dph", name: "SF DPH (DataSF LIVES)", jurisdictionId: "San Francisco", accessType: "open-data", oneTimePullFeasible: "partial", stalenessNote: "LIVES feed frozen ~2021; current SF requires manual export." }),
    provEntry({ sourceId: "dc_health", name: "DC Health (HealthSpace)", jurisdictionId: "Washington DC", accessType: "html-scrape", oneTimePullFeasible: "partial", stalenessNote: "HTML/PDF reports — manual intake." }),
    provEntry({ sourceId: "newark_lookup", name: "Newark Health Inspection Lookup", jurisdictionId: "Newark, NJ", accessType: "html-scrape", oneTimePullFeasible: "partial", stalenessNote: "JS/CAPTCHA lookup — manual / OPRA via Food & Drug Bureau." }),
    provEntry({ sourceId: "bergen_opra", name: "Bergen County (OPRA)", jurisdictionId: "Bergen County, NJ", accessType: "none", oneTimePullFeasible: "no", stalenessNote: "No online DB — OPRA request per municipality." }),
    provEntry({ sourceId: "fl_fdacs", name: "Florida FDACS Food Permit Center", jurisdictionId: "Florida (FDACS)", accessType: "none", oneTimePullFeasible: "no", stalenessNote: "robots.txt default-deny — manual UI / public-records request." }),
  );

  // sequential No.
  regulatory.forEach((r, i) => (r.no = i + 1));
  inspections.forEach((r, i) => (r.no = i + 1));

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

  const alerts = regulatory.filter((r) => r.alertTriggered).length + inspections.filter((r) => r.alertTriggered).length;
  const bySource: Record<string, number> = {};
  for (const r of [...regulatory, ...inspections]) bySource[r.provenance.sourceId] = (bySource[r.provenance.sourceId] ?? 0) + 1;

  const meta = {
    schemaVersion: "2.0.0",
    dataAsOf: TODAY,
    reportingPeriod: { label: `${TODAY.slice(0, 7)} (real pull)`, year: Number(TODAY.slice(0, 4)), month: Number(TODAY.slice(5, 7)) },
    generatedAt: NOW,
    isSeedData: false,
    counts: { regulatory: regulatory.length, inspections: inspections.length, alerts, pendingReview: 0, bySource },
    provenance,
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "regulatory.json"), JSON.stringify(regulatory, null, 2) + "\n");
  writeFileSync(join(OUT, "inspections.json"), JSON.stringify(inspections, null, 2) + "\n");
  writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
  console.log(`\nwrote ${regulatory.length} regulatory + ${inspections.length} inspections (${alerts} alerts) to data/v2/`);
}

main().catch((e) => {
  console.error("collect failed:", e);
  process.exit(1);
});
