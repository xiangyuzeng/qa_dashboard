/**
 * Server-side aggregations over the prepared records. Pages compute these and pass
 * plain arrays to client charts/tables. Pure functions — no DOM, no client state.
 */
import type {
  InspectionRecord,
  RegulatoryRecord,
  ImportExportRecord,
  RegulationRecord,
  SentimentRecord,
} from "./schema";
import { ResultEnum, JurisdictionEnum, BrandEnum } from "./schema";
import { getViolationCategories } from "./data";
// RISK_LEVELS_ORDER + daysToEffective live in pure modules (colors/util) so CLIENT components can
// import them WITHOUT pulling aggregate.ts → data.ts (the whole ~1MB JSON) into their bundles.
// Re-exported here for back-compat with server callers that import them from aggregate.
import { RISK_LEVELS_ORDER } from "./colors";
import { daysToEffective } from "./i18n/util";
export { RISK_LEVELS_ORDER, daysToEffective };

export const FAIL_RESULTS = ["Fail", "Closed", "Permit Suspended", "Stop Sale"];
export const PASS_RESULTS = ["Pass"];
export const COMPETITOR_BRANDS = [
  "Starbucks",
  "Dunkin",
  "Pret A Manger",
  "Blue Bottle Coffee",
  "McDonald's",
];

const isEvaluable = (r: InspectionRecord) =>
  r.provenance.dataAvailability === "available" &&
  r.inspectionResult != null &&
  r.inspectionResult !== "N/A";

function passRate(records: InspectionRecord[]): number | null {
  const evaluable = records.filter(isEvaluable);
  if (evaluable.length === 0) return null;
  const pass = evaluable.filter((r) => PASS_RESULTS.includes(r.inspectionResult as string));
  return Math.round((pass.length / evaluable.length) * 100);
}

function failRate(records: InspectionRecord[]): number | null {
  const evaluable = records.filter(isEvaluable);
  if (evaluable.length === 0) return null;
  const fail = evaluable.filter((r) => FAIL_RESULTS.includes(r.inspectionResult as string));
  return Math.round((fail.length / evaluable.length) * 100);
}

export type Kpis = {
  highRisk: number;
  recallsOurCats: number;
  ourPassRate: number | null;
  compPassRate: number | null;
  alerts: number;
  followups: number;
  cafeFlags: number;
  inspections: number;
  jurisdictionsCovered: number;
};

export function computeKpis(
  insp: InspectionRecord[],
  reg: RegulatoryRecord[],
): Kpis {
  const ours = insp.filter((r) => r.brand === "Luckin Coffee");
  const comp = insp.filter((r) => COMPETITOR_BRANDS.includes(r.brand as string));
  return {
    highRisk:
      insp.filter((r) => r.riskLevel === "高风险").length +
      reg.filter((r) => r.riskLevel === "高风险").length,
    recallsOurCats: reg.filter(
      (r) => r.category === "召回事件" && r.relevanceTags.length > 0,
    ).length,
    ourPassRate: passRate(ours),
    compPassRate: passRate(comp),
    alerts:
      insp.filter((r) => r.alertTriggered).length +
      reg.filter((r) => r.alertTriggered).length,
    followups: insp.filter((r) => r.followupRequired === "是 Yes").length,
    cafeFlags: insp.filter((r) => r.cafeRiskTags.length > 0).length,
    inspections: insp.length,
    jurisdictionsCovered: new Set(insp.map((r) => r.jurisdiction).filter(Boolean)).size,
  };
}

export function resultDistribution(insp: InspectionRecord[]) {
  return ResultEnum.options
    .map((result) => ({
      name: result,
      value: insp.filter((r) => r.inspectionResult === result).length,
    }))
    .filter((d) => d.value > 0);
}

export function resultByJurisdiction(insp: InspectionRecord[]) {
  return JurisdictionEnum.options
    .map((j) => {
      const rows = insp.filter((r) => r.jurisdiction === j);
      const entry: Record<string, string | number> = { jurisdiction: j };
      for (const result of ResultEnum.options) {
        entry[result] = rows.filter((r) => r.inspectionResult === result).length;
      }
      entry.__total = rows.length;
      return entry;
    })
    .filter((e) => (e.__total as number) > 0);
}

export type CategoryCount = {
  id: number;
  labelZh: string;
  labelEn: string;
  count: number;
  cafe: boolean;
  criticalCount: number;
};

export function categoryCounts(insp: InspectionRecord[]): CategoryCount[] {
  const cats = getViolationCategories();
  return cats
    .map((c) => {
      const rows = insp.filter(
        (r) =>
          r.standardizedCategoryId === c.id ||
          r.standardizedCategoriesAll.includes(c.id),
      );
      return {
        id: c.id,
        labelZh: `${c.id} ${c.zh}`,
        labelEn: `${c.id} ${c.en}`,
        count: rows.length,
        cafe: c.cafeHighFrequency,
        criticalCount: rows.filter((r) => r.violationSeverity === "严重（主要）Critical")
          .length,
      };
    })
    .filter((c) => c.count > 0);
}

export function topCategories(insp: InspectionRecord[], n = 8): CategoryCount[] {
  return [...categoryCounts(insp)].sort((a, b) => b.count - a.count).slice(0, n);
}

export type CafeRiskCount = { tag: string; count: number };

export function cafeRiskBreakdown(insp: InspectionRecord[]): CafeRiskCount[] {
  const tally: Record<string, number> = {};
  for (const r of insp)
    for (const tag of r.cafeRiskTags) tally[tag] = (tally[tag] ?? 0) + 1;
  return Object.entries(tally)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

/* ── brand benchmarking (used by P5; defined here as the shared aggregate home) ── */
export type BrandStat = {
  brand: string;
  records: number;
  passRate: number | null;
  failRate: number | null;
  avgScore: number | null;
  highRisk: number;
  critical: number;
};

export function brandStats(insp: InspectionRecord[]): BrandStat[] {
  return BrandEnum.options.map((brand) => {
    const rows = insp.filter((r) => r.brand === brand);
    const scored = rows.filter((r) => typeof r.score === "number");
    return {
      brand,
      records: rows.length,
      passRate: passRate(rows),
      failRate: failRate(rows),
      avgScore: scored.length
        ? Math.round(
            (scored.reduce((s, r) => s + (r.score as number), 0) / scored.length) * 10,
          ) / 10
        : null,
      highRisk: rows.filter((r) => r.riskLevel === "高风险").length,
      critical: rows.filter((r) => r.violationSeverity === "严重（主要）Critical").length,
    };
  });
}

export const BENCH_BRANDS = ["Luckin Coffee", ...COMPETITOR_BRANDS];

/** Top categories × brand → grouped bar (x = category, series = brand). */
export function categoryByBrand(
  insp: InspectionRecord[],
  brands: string[] = BENCH_BRANDS,
  topN = 8,
): Record<string, string | number>[] {
  return topCategories(insp, topN).map((c) => {
    const row: Record<string, string | number> = {
      catId: c.id,
      labelZh: c.labelZh,
      labelEn: c.labelEn,
    };
    for (const b of brands) {
      row[b] = insp.filter(
        (r) =>
          r.brand === b &&
          (r.standardizedCategoryId === c.id || r.standardizedCategoriesAll.includes(c.id)),
      ).length;
    }
    return row;
  });
}

/** Result mix per brand → stacked bar. */
export function resultMixByBrand(insp: InspectionRecord[]): Record<string, string | number>[] {
  return BrandEnum.options
    .map((b) => {
      const rows = insp.filter((r) => r.brand === b);
      const e: Record<string, string | number> = { brand: b, __total: rows.length };
      for (const res of ResultEnum.options) e[res] = rows.filter((r) => r.inspectionResult === res).length;
      return e;
    })
    .filter((e) => (e.__total as number) > 0);
}

/** Monthly time-series (fixed period axis for static data). */
export function trendsOverTime(insp: InspectionRecord[]): Record<string, string | number>[] {
  const byMonth: Record<string, { inspections: number; highRisk: number; fail: number }> = {};
  for (const r of insp) {
    if (!r.inspectionDate) continue;
    const m = r.inspectionDate.slice(0, 7);
    byMonth[m] ??= { inspections: 0, highRisk: 0, fail: 0 };
    byMonth[m].inspections++;
    if (r.riskLevel === "高风险") byMonth[m].highRisk++;
    if (FAIL_RESULTS.includes(r.inspectionResult as string)) byMonth[m].fail++;
  }
  return Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, v]) => ({ period, ...v }));
}

/** Critical vs non-critical per top category → stacked bar. */
export function severityByCategory(
  insp: InspectionRecord[],
  topN = 10,
): { catId: number; labelZh: string; labelEn: string; critical: number; nonCritical: number }[] {
  return topCategories(insp, topN).map((c) => {
    const rows = insp.filter(
      (r) => r.standardizedCategoryId === c.id || r.standardizedCategoriesAll.includes(c.id),
    );
    return {
      catId: c.id,
      labelZh: c.labelZh,
      labelEn: c.labelEn,
      critical: rows.filter((r) => r.violationSeverity === "严重（主要）Critical").length,
      nonCritical: rows.filter((r) => r.violationSeverity === "一般 Non-critical").length,
    };
  });
}

export type RepeatGroup = {
  groupId: string;
  brand: string | null;
  jurisdiction: string | null;
  categoryId: number | null;
  count: number;
  members: { id: string; storeName: string | null; date: string | null; result: string | null }[];
};

/** Repeat-violation groups (same brand/area + category, ≥2), keyed by repeatViolationGroupId. */
export function repeatGroups(insp: InspectionRecord[]): RepeatGroup[] {
  const groups: Record<string, InspectionRecord[]> = {};
  for (const r of insp) if (r.repeatViolationGroupId) (groups[r.repeatViolationGroupId] ??= []).push(r);
  return Object.entries(groups)
    .filter(([, rows]) => rows.length >= 2)
    .map(([groupId, rows]) => ({
      groupId,
      brand: rows[0].brand,
      jurisdiction: rows[0].jurisdiction,
      categoryId: rows[0].standardizedCategoryId,
      count: rows.length,
      members: rows.map((r) => ({
        id: r.id,
        storeName: r.storeName,
        date: r.inspectionDate,
        result: r.inspectionResult,
      })),
    }))
    .sort((a, b) => b.count - a.count);
}

const RISK_W: Record<string, number> = { 高风险: 3, 中风险: 2, 低风险: 1, 关注: 0.5, 信息参考: 0 };
const riskW = (r: string | null) => (r ? (RISK_W[r] ?? 0) : -1);

export type ChecklistItem = {
  id: number;
  labelZh: string;
  labelEn: string;
  note: string | null;
  frequency: number;
  critical: number;
  composite: number;
  cafe: boolean;
};

/**
 * Self-inspection checklist (spec §11.2 café risks × dataset frequency/severity).
 * composite = frequency + critical (severity-weighted); café-★ categories pinned on top.
 */
export function actionChecklist(insp: InspectionRecord[]): ChecklistItem[] {
  const items = getViolationCategories().map((c) => {
    const rows = insp.filter(
      (r) => r.standardizedCategoryId === c.id || r.standardizedCategoriesAll.includes(c.id),
    );
    const critical = rows.filter((r) => r.violationSeverity === "严重（主要）Critical").length;
    return {
      id: c.id,
      labelZh: `${c.id} ${c.zh}`,
      labelEn: `${c.id} ${c.en}`,
      note: c.note,
      frequency: rows.length,
      critical,
      composite: rows.length + critical,
      cafe: c.cafeHighFrequency,
    };
  });
  const cafe = items.filter((i) => i.cafe).sort((a, b) => b.composite - a.composite);
  const rest = items.filter((i) => !i.cafe && i.frequency > 0).sort((a, b) => b.composite - a.composite);
  return [...cafe, ...rest];
}

export type TrainingItem = {
  id: number;
  labelZh: string;
  labelEn: string;
  note: string | null;
  critical: number;
  repeat: number;
  score: number;
  cafe: boolean;
};

/** Training focus — rank by Critical-count + repeat-incidence; force-include any café-★ that appears. */
export function trainingFocus(insp: InspectionRecord[], topN = 6): TrainingItem[] {
  const appears = (id: number) =>
    insp.some((r) => r.standardizedCategoryId === id || r.standardizedCategoriesAll.includes(id));
  const items: TrainingItem[] = getViolationCategories().map((c) => {
    const rows = insp.filter(
      (r) => r.standardizedCategoryId === c.id || r.standardizedCategoriesAll.includes(c.id),
    );
    const critical = rows.filter((r) => r.violationSeverity === "严重（主要）Critical").length;
    const repeat = rows.filter((r) => r.repeatViolationGroupId).length;
    return {
      id: c.id,
      labelZh: `${c.id} ${c.zh}`,
      labelEn: `${c.id} ${c.en}`,
      note: c.note,
      critical,
      repeat,
      score: critical * 2 + repeat,
      cafe: c.cafeHighFrequency,
    };
  });
  const top = items.filter((i) => i.score > 0).sort((a, b) => b.score - a.score).slice(0, topN);
  const cafeExtra = items.filter((i) => i.cafe && appears(i.id) && !top.some((t) => t.id === i.id));
  return [...top, ...cafeExtra];
}

export type WatchEntity = {
  key: string;
  storeName: string | null;
  brand: string | null;
  jurisdiction: string | null;
  riskLevel: string | null;
  alert: boolean;
  repeat: boolean;
  alertReason: string | null;
  sampleId: string;
};

/** High-risk watch-list — stores with a fired alert or a repeat-violation group. */
export function watchlist(insp: InspectionRecord[]): WatchEntity[] {
  const map: Record<string, InspectionRecord[]> = {};
  for (const r of insp) {
    const key = `${r.brand ?? ""}|${r.storeName ?? ""}|${r.jurisdiction ?? ""}`;
    (map[key] ??= []).push(r);
  }
  const entities: WatchEntity[] = [];
  for (const [key, rows] of Object.entries(map)) {
    const alert = rows.some((r) => r.alertTriggered);
    const repeat = rows.some((r) => r.repeatViolationGroupId);
    if (!alert && !repeat) continue;
    const top = [...rows].sort((a, b) => riskW(b.riskLevel) - riskW(a.riskLevel))[0];
    entities.push({
      key,
      storeName: top.storeName,
      brand: top.brand,
      jurisdiction: top.jurisdiction,
      riskLevel: top.riskLevel,
      alert,
      repeat,
      alertReason: rows.find((r) => r.alertReason)?.alertReason ?? null,
      sampleId: top.id,
    });
  }
  return entities.sort((a, b) => riskW(b.riskLevel) - riskW(a.riskLevel));
}

export { passRate, failRate };

/* ────────────────────────────────────────────────────────────────────────────
 * V2 — cross-module rollups + viz feeds (richer aggregation / "too plain" fix)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Risk heatmap rows = the 5 modules; columns = the 5 risk levels (high → info). */
export const HEATMAP_MODULES = [
  "food_safety",
  "import",
  "regulation",
  "inspection",
  "sentiment",
] as const;
export type HeatModule = (typeof HEATMAP_MODULES)[number];

// RISK_LEVELS_ORDER is defined in ./colors and re-exported at the top of this file.

const MODULE_ROUTE: Record<HeatModule, string> = {
  food_safety: "/intelligence",
  import: "/import",
  regulation: "/regulation",
  inspection: "/inspections",
  sentiment: "/sentiment",
};

export type HeatCell = { module: HeatModule; risk: string; count: number; href: string };
export type HeatRow = { module: HeatModule; cells: HeatCell[]; total: number };

/** Count servable rows per (module × riskLevel) for the Overview heatmap centerpiece. */
export function riskHeatmap(args: {
  food: RegulatoryRecord[];
  imp: ImportExportRecord[];
  reg: RegulationRecord[];
  insp: InspectionRecord[];
  sent: SentimentRecord[];
}): HeatRow[] {
  const byModule: Record<HeatModule, { riskLevel: string | null }[]> = {
    food_safety: args.food,
    import: args.imp,
    regulation: args.reg,
    inspection: args.insp,
    sentiment: args.sent,
  };
  return HEATMAP_MODULES.map((m) => {
    const rows = byModule[m];
    const cells: HeatCell[] = RISK_LEVELS_ORDER.map((risk) => ({
      module: m,
      risk,
      count: rows.filter((r) => r.riskLevel === risk).length,
      href: MODULE_ROUTE[m],
    }));
    return { module: m, cells, total: rows.length };
  });
}

/** One bar per regulation on a shared date axis (publication → effective). */
export type GanttBar = {
  id: string;
  labelZh: string;
  labelEn: string;
  jurisdiction: string | null;
  status: string | null;
  topic: string | null;
  start: string | null; // publicationPassageDate
  end: string | null; // effectiveDate
  daysToEffective: number | null;
  bucket: "past" | "imminent" | "soon" | "later" | "unknown";
  href: string | null;
};

export function complianceGantt(reg: RegulationRecord[], todayIso = "2026-06-19"): GanttBar[] {
  const today = new Date(todayIso + "T00:00:00Z").getTime();
  const DAY = 86400000;
  return reg
    .map((r): GanttBar => {
      const end = r.effectiveDate ? new Date(r.effectiveDate + "T00:00:00Z").getTime() : null;
      const days = end == null ? null : Math.round((end - today) / DAY);
      const bucket: GanttBar["bucket"] =
        days == null ? "unknown" : days < 0 ? "past" : days <= 30 ? "imminent" : days <= 120 ? "soon" : "later";
      return {
        id: r.id,
        labelZh: r.chineseTitle ?? r.regulationBillName ?? "",
        labelEn: r.englishTitle ?? r.regulationBillName ?? "",
        jurisdiction: r.jurisdiction,
        status: r.status,
        topic: r.topic,
        start: r.publicationPassageDate,
        end: r.effectiveDate,
        daysToEffective: days,
        bucket,
        href: r.sourceUrl,
      };
    })
    .sort((a, b) => {
      // upcoming (smallest non-negative days) first, then past, then unknown last
      const rank = (x: GanttBar) =>
        x.daysToEffective == null ? 1e9 : x.daysToEffective < 0 ? 1e8 + -x.daysToEffective : x.daysToEffective;
      return rank(a) - rank(b);
    });
}

/** Shared min/max date domain for positioning Gantt bars (always includes today). */
export function ganttDomain(bars: GanttBar[], todayIso = "2026-06-19"): { min: string; max: string } {
  const dates = bars.flatMap((b) => [b.start, b.end]).filter(Boolean) as string[];
  dates.push(todayIso);
  dates.sort();
  return { min: dates[0], max: dates[dates.length - 1] };
}

/* ────────────────────────────────────────────────────────────────────────────
 * V2.7 — compliance-domain aggregation (labor/building/environment/consumer).
 * Structural input so one set of helpers serves all four record types.
 * ──────────────────────────────────────────────────────────────────────────── */
export type ComplianceLike = {
  id: string;
  jurisdiction: string | null;
  riskLevel: string | null;
  effectiveDate: string | null;
  status: string | null;
  topic: string | null;
  chineseTitle: string | null;
  englishTitle: string | null;
  sourceUrl: string | null;
  appliesToUs?: boolean | null;
  regulationBillName?: string | null;
  codeStandardName?: string | null;
  regulationName?: string | null;
};

const complianceName = (r: ComplianceLike) => r.regulationBillName ?? r.codeStandardName ?? r.regulationName ?? null;

export type ComplianceCounts = { total: number; applies: number; notYet: number; pending: number; approaching: number; highRisk: number };
/** Posture rollup for a domain: appliesToUs tri-state + ≤180-day approaching + high-risk. */
export function complianceCounts(rows: ComplianceLike[], todayIso: string): ComplianceCounts {
  let applies = 0, notYet = 0, pending = 0, approaching = 0, highRisk = 0;
  for (const r of rows) {
    if (r.appliesToUs === true) applies++;
    else if (r.appliesToUs === false) notYet++;
    else pending++;
    if (r.riskLevel === "高风险") highRisk++;
    const d = daysToEffective(r.effectiveDate, todayIso);
    if (d != null && d >= 0 && d <= 180) approaching++;
  }
  return { total: rows.length, applies, notYet, pending, approaching, highRisk };
}

/** One Gantt bar per DATED rule (effective date point) — the "long time span" timeline.
 *  Ranks upcoming-first then most-recent past, caps to `limit`, then sorts chronologically
 *  so the rendered timeline stays readable while still spanning years. */
export function complianceTimeline(rows: ComplianceLike[], todayIso: string, limit = 24): GanttBar[] {
  const bars = rows
    .filter((r) => r.effectiveDate)
    .map((r): GanttBar => {
      const days = daysToEffective(r.effectiveDate, todayIso)!;
      const bucket: GanttBar["bucket"] = days < 0 ? "past" : days <= 30 ? "imminent" : days <= 120 ? "soon" : "later";
      const name = complianceName(r);
      return {
        id: r.id,
        labelZh: r.chineseTitle ?? name ?? "",
        labelEn: r.englishTitle ?? name ?? "",
        jurisdiction: r.jurisdiction,
        status: r.status,
        topic: r.topic,
        start: null,
        end: r.effectiveDate,
        daysToEffective: days,
        bucket,
        href: r.sourceUrl,
      };
    });
  const rank = (b: GanttBar) => (b.daysToEffective! < 0 ? 1e7 - b.daysToEffective! : b.daysToEffective!);
  return [...bars]
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, limit)
    .sort((a, b) => String(a.end).localeCompare(String(b.end)));
}

/** Risk-level mix per jurisdiction → StackedBar feed (series = the 5 risk levels). */
export function complianceRiskByJurisdiction(rows: ComplianceLike[]): {
  data: Record<string, string | number>[];
  series: string[];
} {
  const byJ: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const j = r.jurisdiction ?? "—";
    const lvl = r.riskLevel ?? "信息参考";
    (byJ[j] ??= {})[lvl] = (byJ[j][lvl] ?? 0) + 1;
  }
  const series = [...RISK_LEVELS_ORDER] as string[];
  const data = Object.entries(byJ)
    .map(([jurisdiction, mix]) => {
      const row: Record<string, string | number> = { jurisdiction };
      let total = 0;
      for (const s of series) {
        row[s] = mix[s] ?? 0;
        total += mix[s] ?? 0;
      }
      row.__total = total;
      return row;
    })
    .sort((a, b) => (b.__total as number) - (a.__total as number));
  return { data, series };
}

/** Import rows tallied by regulatory action (HBar feed — the default /import hero). */
export function importByAction(imp: ImportExportRecord[]): { action: string; count: number }[] {
  const tally: Record<string, number> = {};
  for (const r of imp) if (r.regulatoryAction) tally[r.regulatoryAction] = (tally[r.regulatoryAction] ?? 0) + 1;
  return Object.entries(tally)
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count);
}

/** Sentiment rows tallied by incident category (HBar feed). */
export function sentimentByCategory(sent: SentimentRecord[]): { category: string; count: number }[] {
  const tally: Record<string, number> = {};
  for (const r of sent) if (r.sentimentCategory) tally[r.sentimentCategory] = (tally[r.sentimentCategory] ?? 0) + 1;
  return Object.entries(tally)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

