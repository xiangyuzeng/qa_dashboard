/** Alert-row projection + tallies for the Alerts surface (spec §10.1 triggers, applied at prep). */
import type { InspectionRecord, RegulatoryRecord } from "./schema";
import { getJurisdictions } from "./data";

export type AlertRow = {
  id: string;
  kind: "inspection" | "regulatory";
  riskLevel: string | null;
  riskWeight: number;
  jurisOrSource: string;
  brand: string | null;
  titleZh: string;
  titleEn: string;
  date: string | null;
  result: string | null;
  alertReason: string | null;
  href: string | null;
  external: boolean;
};

const RISK_WEIGHT: Record<string, number> = { 高风险: 3, 中风险: 2, 低风险: 1, 关注: 0.5, 信息参考: 0 };
const w = (r: string | null) => (r ? (RISK_WEIGHT[r] ?? 0) : -1);

export function buildAlertRows(
  insp: InspectionRecord[],
  reg: RegulatoryRecord[],
): AlertRow[] {
  const fromInsp: AlertRow[] = insp
    .filter((r) => r.alertTriggered)
    .map((r) => ({
      id: r.id,
      kind: "inspection",
      riskLevel: r.riskLevel,
      riskWeight: w(r.riskLevel),
      jurisOrSource: r.jurisdiction ?? "",
      brand: r.brand,
      titleZh: r.storeName ?? "",
      titleEn: r.storeName ?? "",
      date: r.inspectionDate,
      result: r.inspectionResult,
      alertReason: r.alertReason,
      href: `/inspections/${r.id}`,
      external: false,
    }));
  const fromReg: AlertRow[] = reg
    .filter((r) => r.alertTriggered)
    .map((r) => ({
      id: r.id,
      kind: "regulatory",
      riskLevel: r.riskLevel,
      riskWeight: w(r.riskLevel),
      jurisOrSource: r.source ?? "",
      brand: null,
      titleZh: r.chineseTitle ?? "",
      titleEn: r.englishTitle ?? "",
      date: r.publicationDate,
      result: null,
      alertReason: r.alertReason,
      href: r.sourceUrl,
      external: true,
    }));
  return [...fromInsp, ...fromReg].sort(
    (a, b) => b.riskWeight - a.riskWeight || (b.date ?? "").localeCompare(a.date ?? ""),
  );
}

type Triggerable = { alertTriggered: boolean; alertRuleIds: string[] };

export function alertsByTrigger(insp: Triggerable[], reg: Triggerable[]) {
  const rules = getJurisdictions().alertRules;
  const scopeById: Record<string, string> = {};
  rules.forEach((r) => (scopeById[r.id] = r.scope));
  const tally: Record<string, number> = {};
  [...insp, ...reg]
    .filter((r) => r.alertTriggered)
    .forEach((r) =>
      r.alertRuleIds.forEach((id) => {
        const label = scopeById[id] ?? id;
        tally[label] = (tally[label] ?? 0) + 1;
      }),
    );
  return Object.entries(tally)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function alertsByJurisdiction(insp: InspectionRecord[]) {
  const tally: Record<string, number> = {};
  insp
    .filter((r) => r.alertTriggered && r.jurisdiction)
    .forEach((r) => (tally[r.jurisdiction as string] = (tally[r.jurisdiction as string] ?? 0) + 1));
  return Object.entries(tally)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}
