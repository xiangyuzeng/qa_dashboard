/** Alert-row projection + tallies for the Alerts surface (spec §10.1 triggers, applied at prep). */
import type {
  InspectionRecord,
  RegulatoryRecord,
  ImportExportRecord,
  RegulationRecord,
  SentimentRecord,
  LaborRecord,
  BuildingRecord,
  EnvironmentRecord,
  ConsumerRecord,
} from "./schema";
import type { ApplicabilityVerdict } from "./applicability";
import { getJurisdictions } from "./data";

export type AlertType = "food_safety" | "import_compliance" | "state_local_reg" | "inspection" | "applicability";

/** Compliance-domain records share these alerting fields — one generic mapper covers all four. */
type DomainAlertable = {
  id: string;
  alertTriggered: boolean;
  riskLevel: string | null;
  jurisdiction: string | null;
  chineseTitle: string | null;
  englishTitle: string | null;
  effectiveDate: string | null;
  alertReason: string | null;
  sourceUrl: string | null;
};

export type AlertRow = {
  id: string;
  kind: "inspection" | "regulatory";
  /** 4-type classification (V2 §8), derived from record.module. */
  alertType: AlertType;
  /** source module — set for compliance-domain + applicability alerts; else derived from alertType in the UI. */
  module?: string;
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
  labor: LaborRecord[] = [],
  building: BuildingRecord[] = [],
  environment: EnvironmentRecord[] = [],
  consumer: ConsumerRecord[] = [],
  applic: AlertRow[] = [],
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
  // Sentiment alerts fold into `food_safety` deliberately: the spec's AlertType model has exactly
  // 4 buckets (no sentiment type), and the sentiment feed is food-safety media (Food Safety News).
  // Latent today (the data has 0 alert-triggered sentiment rows); revisit if a 5th type is added.
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
  // V2.5 — labor/building/environment/consumer compliance alerts bucket into state_local_reg
  // (regulatory-compliance across domains); the row title/reason carries the domain specifics.
  const fromDomain = (arr: DomainAlertable[], module: string): AlertRow[] =>
    arr
      .filter((r) => r.alertTriggered)
      .map((r) => ({
        id: r.id,
        kind: "regulatory" as const,
        alertType: "state_local_reg" as const,
        module,
        riskLevel: r.riskLevel,
        riskWeight: w(r.riskLevel),
        jurisOrSource: r.jurisdiction ?? "",
        brand: null,
        titleZh: r.chineseTitle ?? "",
        titleEn: r.englishTitle ?? "",
        date: r.effectiveDate,
        result: null,
        alertReason: r.alertReason,
        href: r.sourceUrl,
        external: true,
      }));
  const fromDomains = [
    ...fromDomain(labor, "labor"),
    ...fromDomain(building, "building"),
    ...fromDomain(environment, "environment"),
    ...fromDomain(consumer, "consumer"),
  ];
  return [...fromInsp, ...fromReg, ...fromImport, ...fromRegs, ...fromSent, ...fromDomains, ...applic].sort(
    (a, b) => b.riskWeight - a.riskWeight || (b.date ?? "").localeCompare(a.date ?? ""),
  );
}

/** Engine-derived alerts — fire when a scale-gated rule flips to Applies (高风险) or Approaching (关注). */
export function applicabilityAlertRows(verdicts: ApplicabilityVerdict[]): AlertRow[] {
  return verdicts
    .filter((v) => v.status === "applies" || v.status === "approaching")
    .map((v) => ({
      id: `applic_${v.rule.id}`,
      kind: "regulatory" as const,
      alertType: "applicability" as const,
      module: v.rule.module,
      riskLevel: v.status === "applies" ? "高风险" : "关注",
      riskWeight: v.status === "applies" ? 3 : 0.5,
      jurisOrSource: v.rule.jurisdiction,
      brand: null,
      titleZh: v.rule.regulationName.zh,
      titleEn: v.rule.regulationName.en,
      date: v.rule.effectiveDate,
      result: null,
      alertReason:
        v.status === "applies"
          ? `threshold met — applies (our ${v.ourValue} vs ${v.threshold})`
          : `approaching threshold (our ${v.ourValue} vs ${v.threshold})`,
      href: v.rule.thresholdSourceUrl,
      external: true,
    }));
}

/** Tally alert rows by the 5 alert types (drives the AlertsClient tiles/filter). */
export function alertsByType(rows: AlertRow[]): { type: AlertType; count: number }[] {
  const tally: Record<string, number> = {};
  for (const r of rows) tally[r.alertType] = (tally[r.alertType] ?? 0) + 1;
  return (["food_safety", "import_compliance", "state_local_reg", "inspection", "applicability"] as AlertType[]).map((type) => ({
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
