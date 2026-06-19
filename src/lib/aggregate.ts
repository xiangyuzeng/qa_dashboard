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

export { passRate, failRate };
