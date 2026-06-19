/**
 * Server-side aggregations over the prepared records. Pages compute these and pass
 * plain arrays to client charts/tables. Pure functions — no DOM, no client state.
 */
import type { InspectionRecord, RegulatoryRecord } from "./schema";
import { ResultEnum, JurisdictionEnum, BrandEnum } from "./schema";
import { getViolationCategories } from "./data";

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
