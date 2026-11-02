/**
 * V2.5 compliance-domain record builders — PURE (no network, no side effects), so they
 * are shared by BOTH the full-refresh pipeline (`collect.ts`) and the surgical generator
 * (`build_domains.ts`, which writes only the 4 new files + patches meta.counts, leaving
 * the curated 6-module snapshot untouched). Seeds → records, mirroring `collectRegulationSeeds`.
 */
import { assessLabor, assessBuilding, assessEnvironment, assessConsumer } from "./lib/risk";
import { UNASSIGNED_ID, extKey } from "./lib/stage";
import { laborSeeds, buildingSeeds, environmentSeeds, consumerSeeds } from "./seeds";
import { evaluate, isApplicable } from "../src/lib/applicability";
import type {
  LaborRecord,
  BuildingRecord,
  EnvironmentRecord,
  ConsumerRecord,
  Provenance,
  CompanyProfile,
  ApplicabilityRule,
} from "../src/lib/schema";

const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);

// externalKey: the curated seed's own identity (rule name + jurisdiction) — our id comes from prep:merge
const prov = (sourceId: string, url: string | null, externalKey: string): Provenance => ({
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
  externalKey,
  firstSeenAt: null,
  lastSeenAt: null,
  missingRuns: 0,
  notReturnedDays: null,
  sourceState: "current",
});

export function buildLaborRecords(): LaborRecord[] {
  return laborSeeds.map((s) => {
    const a = assessLabor({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as LaborRecord["riskLevel"];
    return {
      id: UNASSIGNED_ID,
      module: "labor" as const,
      no: null,
      jurisdiction: s.jurisdiction as LaborRecord["jurisdiction"],
      regulationBillName: s.regulationBillName,
      chineseTitle: s.chineseTitle,
      englishTitle: s.englishTitle,
      agency: s.agency,
      applicabilityThreshold: s.applicabilityThreshold,
      appliesToUs: null,
      status: s.status as LaborRecord["status"],
      effectiveDate: s.effectiveDate,
      keyRequirements: s.keyRequirements,
      chineseSummary: s.chineseSummary,
      englishSummary: s.englishSummary,
      businessImpact: s.businessImpact,
      enforcementRecord: s.enforcementRecord,
      riskLevel,
      sourceUrl: s.sourceUrl,
      recommendedAction: s.recommendedAction,
      topic: s.topic as LaborRecord["topic"],
      applicabilityRuleId: s.applicabilityRuleId,
      alertTriggered: a.alertTriggered || riskLevel === "高风险",
      alertReason: a.alertReason,
      alertRuleIds: a.alertRuleIds,
      reviewed: true,
      reviewStatus: "approved" as const,
      reviewNote: "curated authoritative rule",
      provenance: prov("dcwp_dol_labor", s.sourceUrl, extKey("seed-labor", s.regulationBillName, s.jurisdiction)),
    };
  });
}

export function buildBuildingRecords(): BuildingRecord[] {
  return buildingSeeds.map((s) => {
    const a = assessBuilding({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as BuildingRecord["riskLevel"];
    return {
      id: UNASSIGNED_ID,
      module: "building" as const,
      no: null,
      jurisdiction: s.jurisdiction as BuildingRecord["jurisdiction"],
      codeStandardName: s.codeStandardName,
      chineseTitle: s.chineseTitle,
      englishTitle: s.englishTitle,
      agency: s.agency,
      codeCitation: s.codeCitation,
      status: s.status as BuildingRecord["status"],
      effectiveDate: s.effectiveDate,
      coveredEntities: s.coveredEntities,
      keyRequirements: s.keyRequirements,
      chineseSummary: s.chineseSummary,
      englishSummary: s.englishSummary,
      businessImpact: s.businessImpact,
      inspectionCitationRecord: s.inspectionCitationRecord,
      penalty: s.penalty,
      riskLevel,
      sourceUrl: s.sourceUrl,
      recommendedAction: s.recommendedAction,
      topic: s.topic as BuildingRecord["topic"],
      alertTriggered: a.alertTriggered || riskLevel === "高风险",
      alertReason: a.alertReason,
      alertRuleIds: a.alertRuleIds,
      reviewed: true,
      reviewStatus: "approved" as const,
      reviewNote: "curated authoritative standard",
      provenance: prov("osha_dob_building", s.sourceUrl, extKey("seed-building", s.codeStandardName, s.jurisdiction)),
    };
  });
}

export function buildEnvironmentRecords(): EnvironmentRecord[] {
  return environmentSeeds.map((s) => {
    const a = assessEnvironment({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as EnvironmentRecord["riskLevel"];
    return {
      id: UNASSIGNED_ID,
      module: "environment" as const,
      no: null,
      jurisdiction: s.jurisdiction as EnvironmentRecord["jurisdiction"],
      regulationName: s.regulationName,
      chineseTitle: s.chineseTitle,
      englishTitle: s.englishTitle,
      agency: s.agency,
      applicabilityThreshold: s.applicabilityThreshold,
      appliesToUs: null,
      status: s.status as EnvironmentRecord["status"],
      effectiveDate: s.effectiveDate,
      keyRequirements: s.keyRequirements,
      chineseSummary: s.chineseSummary,
      englishSummary: s.englishSummary,
      businessImpact: s.businessImpact,
      riskLevel,
      sourceUrl: s.sourceUrl,
      recommendedAction: s.recommendedAction,
      topic: s.topic as EnvironmentRecord["topic"],
      applicabilityRuleId: s.applicabilityRuleId,
      alertTriggered: a.alertTriggered || riskLevel === "高风险",
      alertReason: a.alertReason,
      alertRuleIds: a.alertRuleIds,
      reviewed: true,
      reviewStatus: "approved" as const,
      reviewNote: "curated authoritative rule",
      provenance: prov("dep_dsny_env", s.sourceUrl, extKey("seed-environment", s.regulationName, s.jurisdiction)),
    };
  });
}

export function buildConsumerRecords(): ConsumerRecord[] {
  return consumerSeeds.map((s) => {
    const a = assessConsumer({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as ConsumerRecord["riskLevel"];
    return {
      id: UNASSIGNED_ID,
      module: "consumer" as const,
      no: null,
      jurisdiction: s.jurisdiction as ConsumerRecord["jurisdiction"],
      regulationName: s.regulationName,
      chineseTitle: s.chineseTitle,
      englishTitle: s.englishTitle,
      agency: s.agency,
      applicabilityThreshold: s.applicabilityThreshold,
      appliesToUs: null,
      keyRequirements: s.keyRequirements,
      complaintEnforcementRecord: s.complaintEnforcementRecord,
      status: s.status as ConsumerRecord["status"],
      effectiveDate: s.effectiveDate,
      riskLevel,
      sourceUrl: s.sourceUrl,
      recommendedAction: s.recommendedAction,
      chineseSummary: s.chineseSummary,
      englishSummary: s.englishSummary,
      topic: s.topic as ConsumerRecord["topic"],
      applicabilityRuleId: s.applicabilityRuleId,
      alertTriggered: a.alertTriggered || riskLevel === "高风险",
      alertReason: a.alertReason,
      alertRuleIds: a.alertRuleIds,
      reviewed: true,
      reviewStatus: "approved" as const,
      reviewNote: "curated authoritative rule",
      provenance: prov("dcwp_ftc_consumer", s.sourceUrl, extKey("seed-consumer", s.regulationName, s.jurisdiction)),
    };
  });
}

/** Stamp `appliesToUs` from the applicability engine onto records carrying an `applicabilityRuleId`.
 *  Tri-state: true (applies/approaching/always), false (not_yet), null (na/pending → 未评估/待补充,
 *  e.g. an employee-gated rule whose headcount is unknown — never force-false a pending verdict). */
export function stampAppliesToUs<T extends { applicabilityRuleId: string | null; appliesToUs: boolean | null }>(
  records: T[],
  profile: CompanyProfile,
  rules: ApplicabilityRule[],
): void {
  const byId = new Map(evaluate(profile, rules).map((v) => [v.rule.id, v]));
  for (const r of records) {
    if (!r.applicabilityRuleId) continue;
    const v = byId.get(r.applicabilityRuleId);
    if (!v) continue;
    r.appliesToUs = v.pending || v.status === "na" ? null : isApplicable(v.status);
  }
}
