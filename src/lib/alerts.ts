/** Alert-row projection + tallies for the Alerts surface (spec §10.1 triggers, applied at prep). */
import type {
  InspectionRecord,
  RegulatoryRecord,
  ImportExportRecord,
  RegulationRecord,
  SentimentRecord,
} from "./schema";
import { getJurisdictions } from "./data";

export type AlertType = "food_safety" | "import_compliance" | "state_local_reg" | "inspection";

export type AlertRow = {
  id: string;
  kind: "inspection" | "regulatory";
  /** 4-type classification (V2 §8), derived from record.module. */
  alertType: AlertType;
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
  imp: ImportExportRecord[] = [],
  regs: RegulationRecord[] = [],
  sent: SentimentRecord[] = [],
): AlertRow[] {
  const fromInsp: AlertRow[] = insp
    .filter((r) => r.alertTriggered)
    .map((r) => ({
      id: r.id,
      kind: "inspection",
      alertType: "inspection",
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
      alertType: "food_safety",
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
  const fromImport: AlertRow[] = imp
    .filter((r) => r.alertTriggered)
    .map((r) => ({
      id: r.id,
      kind: "regulatory",
      alertType: "import_compliance",
      riskLevel: r.riskLevel,
      riskWeight: w(r.riskLevel),
      jurisOrSource: r.agency ?? "",
      brand: null,
      titleZh: r.chineseTitle ?? "",
      titleEn: r.englishTitle ?? "",
      date: r.publicationDate,
      result: null,
      alertReason: r.alertReason,
      href: r.sourceUrl,
      external: true,
    }));
  const fromRegs: AlertRow[] = regs
    .filter((r) => r.alertTriggered)
    .map((r) => ({
      id: r.id,
      kind: "regulatory",
      alertType: "state_local_reg",
      riskLevel: r.riskLevel,
      riskWeight: w(r.riskLevel),
      jurisOrSource: r.jurisdiction ?? "",
      brand: null,
      titleZh: r.chineseTitle ?? "",
      titleEn: r.englishTitle ?? "",
      date: r.publicationPassageDate,
      result: null,
      alertReason: r.alertReason,
      href: r.sourceUrl,
      external: true,
    }));
  const fromSent: AlertRow[] = sent
    .filter((r) => r.alertTriggered)
    .map((r) => ({
      id: r.id,
      kind: "regulatory",
      alertType: "food_safety",
      riskLevel: r.riskLevel,
      riskWeight: w(r.riskLevel),
      jurisOrSource: r.outlet ?? "",
      brand: r.brandMentioned,
      titleZh: r.chineseTitle ?? "",
      titleEn: r.englishTitle ?? "",
      date: r.publicationDate,
      result: null,
      alertReason: r.alertReason,
      href: r.sourceUrl,
      external: true,
    }));
  return [...fromInsp, ...fromReg, ...fromImport, ...fromRegs, ...fromSent].sort(
    (a, b) => b.riskWeight - a.riskWeight || (b.date ?? "").localeCompare(a.date ?? ""),
  );
}

/** Tally alert rows by the 4 alert types (drives the AlertsClient tiles/filter). */
export function alertsByType(rows: AlertRow[]): { type: AlertType; count: number }[] {
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r.alertType] = (tally[r.alertType] ?? 0) + 1;
  return (["food_safety", "import_compliance", "state_local_reg", "inspection"] as AlertType[]).map((type) => ({
    type,
    count: tally[type] ?? 0,
  }));
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
