/**
 * V2.5 compliance-domain record builders — PURE (no network, no side effects), so they
 * are shared by BOTH the full-refresh pipeline (`collect.ts`) and the surgical generator
 * (`build_domains.ts`, which writes only the 4 new files + patches meta.counts, leaving
 * the curated 6-module snapshot untouched). Seeds → records, mirroring `collectRegulationSeeds`.
 */
import { assessLabor, assessBuilding, assessEnvironment, assessConsumer } from "./lib/risk";
import { hashId } from "./lib/ids";
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

const prov = (sourceId: string, url: string | null): Provenance => ({
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
});

export function buildLaborRecords(): LaborRecord[] {
  return laborSeeds.map((s) => {
    const a = assessLabor({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as LaborRecord["riskLevel"];
    return {
      id: hashId("labor", s.regulationBillName, s.jurisdiction),
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
      provenance: prov("dcwp_dol_labor", s.sourceUrl),
    };
  });
}

export function buildBuildingRecords(): BuildingRecord[] {
  return buildingSeeds.map((s) => {
    const a = assessBuilding({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as BuildingRecord["riskLevel"];
    return {
      id: hashId("bldg", s.codeStandardName, s.jurisdiction),
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
      provenance: prov("osha_dob_building", s.sourceUrl),
    };
  });
}

export function buildEnvironmentRecords(): EnvironmentRecord[] {
  return environmentSeeds.map((s) => {
    const a = assessEnvironment({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as EnvironmentRecord["riskLevel"];
    return {
      id: hashId("env", s.regulationName, s.jurisdiction),
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
      provenance: prov("dep_dsny_env", s.sourceUrl),
    };
  });
}

export function buildConsumerRecords(): ConsumerRecord[] {
  return consumerSeeds.map((s) => {
    const a = assessConsumer({ status: s.status, effectiveDate: s.effectiveDate, today: TODAY });
    const riskLevel = s.riskLevel as ConsumerRecord["riskLevel"];
    return {
      id: hashId("cons", s.regulationName, s.jurisdiction),
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
      provenance: prov("dcwp_ftc_consumer", s.sourceUrl),
    };
  });
}

/** Stamp `appliesToUs` from the applicability engine onto records carrying an `applicabilityRuleId`. */
export function stampAppliesToUs<T extends { applicabilityRuleId: string | null; appliesToUs: boolean | null }>(
  records: T[],
  profile: CompanyProfile,
  rules: ApplicabilityRule[],
): void {
  const verdicts = evaluate(profile, rules);
  const applies = new Map(verdicts.map((v) => [v.rule.id, isApplicable(v.status)]));
  for (const r of records) {
    if (r.applicabilityRuleId && applies.has(r.applicabilityRuleId)) {
      r.appliesToUs = applies.get(r.applicabilityRuleId)!;
    }
  }
}
