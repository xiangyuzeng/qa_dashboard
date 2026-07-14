/**
 * Surgical generator for the V2.5 compliance-domain files. Writes data/v2/{labor,building,
 * environment,consumer}.json from the curated seeds + stamps appliesToUs, and patches ONLY
 * meta.counts / bySource / provenance for the four domains — leaving the curated 6-module
 * snapshot (regulatory/inspections/import/regulation/sentiment) untouched. Deterministic,
 * no network. Use this for the V2.5 build; a full `prep:collect` refresh re-derives everything.
 *
 * Run: npm run prep:domains  (then prep:validate, prep:export)
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CompanyProfileSchema,
  ApplicabilityRulesFileSchema,
  LaborFileSchema,
  BuildingFileSchema,
  EnvironmentFileSchema,
  ConsumerFileSchema,
  type SourceProvenance,
} from "../src/lib/schema";
import {
  buildLaborRecords,
  buildBuildingRecords,
  buildEnvironmentRecords,
  buildConsumerRecords,
  stampAppliesToUs,
} from "./domains";
import { evaluate } from "../src/lib/applicability";

const OUT = join(process.cwd(), "data", "v2");
const NOW = new Date().toISOString();
const load = (f: string) => JSON.parse(readFileSync(join(OUT, f), "utf8"));
const isServable = (r: { reviewed: boolean; reviewStatus: string }) => r.reviewed && r.reviewStatus !== "rejected";

// prep:collect writes curated seeds + live-adapter enforcement rows into these files. This step
// otherwise rebuilds from seeds ONLY and would silently drop the live rows — so preserve any
// live-adapter rows already on disk and merge them back (seeds stay freshly regenerated).
const LIVE_SID = new Set([
  "dol_enforcedata", "osha_establishments", "nyc_dob_violations", "nyc_dsny_enforcement", "nyc_dcwp_consumer",
]);
const preserveLive = <T>(file: string): T[] => {
  try {
    return (load(file) as { provenance?: { sourceId?: string } }[]).filter((r) => LIVE_SID.has(r?.provenance?.sourceId ?? "")) as T[];
  } catch {
    return [];
  }
};
const cnt = (arr: { reviewed: boolean; reviewStatus: string; provenance: { sourceId: string } }[], sid: string) =>
  arr.filter((r) => isServable(r) && r.provenance.sourceId === sid).length;

const labor = [...buildLaborRecords(), ...preserveLive<ReturnType<typeof buildLaborRecords>[number]>("labor.json")];
const building = [...buildBuildingRecords(), ...preserveLive<ReturnType<typeof buildBuildingRecords>[number]>("building.json")];
const environment = [...buildEnvironmentRecords(), ...preserveLive<ReturnType<typeof buildEnvironmentRecords>[number]>("environment.json")];
const consumer = [...buildConsumerRecords(), ...preserveLive<ReturnType<typeof buildConsumerRecords>[number]>("consumer.json")];

labor.forEach((r, i) => (r.no = i + 1));
building.forEach((r, i) => (r.no = i + 1));
environment.forEach((r, i) => (r.no = i + 1));
consumer.forEach((r, i) => (r.no = i + 1));

// Stamp appliesToUs from the engine (labor/environment/consumer; building is premises-universal).
const profile = CompanyProfileSchema.parse(load("company_profile.json"));
const rules = ApplicabilityRulesFileSchema.parse(load("applicability_rules.json"));
stampAppliesToUs([...labor, ...environment, ...consumer], profile, rules);

// Cache the evaluated verdicts (single source = the TS engine) for the Python exporters
// (适用性矩阵 sheet + 合规姿态 posture snapshot). The app evaluates live; this is export-only.
const verdicts = evaluate(profile, rules).map((v) => ({
  id: v.rule.id,
  module: v.rule.module,
  jurisdiction: v.rule.jurisdiction,
  nameZh: v.rule.regulationName.zh,
  nameEn: v.rule.regulationName.en,
  threshold: v.threshold,
  ourValue: v.ourValue,
  status: v.status,
  distance: v.distance,
  pending: v.pending,
  needsVerification: v.rule.needsVerification,
  effectiveDate: v.rule.effectiveDate,
  thresholdSourceUrl: v.rule.thresholdSourceUrl,
  actionZh: v.rule.actionZh,
  actionEn: v.rule.actionEn,
}));
writeFileSync(join(OUT, "applicability_verdicts.json"), JSON.stringify(verdicts, null, 2) + "\n");

// Validate against the file schemas before writing (fail loud on any drift).
LaborFileSchema.parse(labor);
BuildingFileSchema.parse(building);
EnvironmentFileSchema.parse(environment);
ConsumerFileSchema.parse(consumer);

writeFileSync(join(OUT, "labor.json"), JSON.stringify(labor, null, 2) + "\n");
writeFileSync(join(OUT, "building.json"), JSON.stringify(building, null, 2) + "\n");
writeFileSync(join(OUT, "environment.json"), JSON.stringify(environment, null, 2) + "\n");
writeFileSync(join(OUT, "consumer.json"), JSON.stringify(consumer, null, 2) + "\n");

const svLabor = labor.filter(isServable).length;
const svBuilding = building.filter(isServable).length;
const svEnv = environment.filter(isServable).length;
const svConsumer = consumer.filter(isServable).length;

// Patch meta.json (preserve all existing structure; idempotent — set, never increment).
const meta = load("meta.json");
meta.counts.labor = svLabor;
meta.counts.building = svBuilding;
meta.counts.environment = svEnv;
meta.counts.consumer = svConsumer;
meta.counts.bySource = meta.counts.bySource ?? {};
// Per-source servable counts (curated seed source + its live-adapter source, counted separately).
meta.counts.bySource["dcwp_dol_labor"] = cnt(labor, "dcwp_dol_labor");
meta.counts.bySource["osha_dob_building"] = cnt(building, "osha_dob_building");
meta.counts.bySource["nyc_dob_violations"] = cnt(building, "nyc_dob_violations");
meta.counts.bySource["dep_dsny_env"] = cnt(environment, "dep_dsny_env");
meta.counts.bySource["nyc_dsny_enforcement"] = cnt(environment, "nyc_dsny_enforcement");
meta.counts.bySource["dcwp_ftc_consumer"] = cnt(consumer, "dcwp_ftc_consumer");
meta.counts.bySource["nyc_dcwp_consumer"] = cnt(consumer, "nyc_dcwp_consumer");

// Merge the new domain sources into the pull-log (idempotent by sourceId) so /sources + the
// 数据源日志 sheet reflect the curated feeds + the dormant license-swap adapters truthfully.
const pe = (o: Partial<SourceProvenance> & Pick<SourceProvenance, "sourceId" | "name" | "accessType" | "oneTimePullFeasible" | "module" | "status">): SourceProvenance => ({
  jurisdictionId: null,
  endpointOrUrl: null,
  collectedAt: NOW,
  recordCount: 0,
  stalenessNote: null,
  reVerifyBeforeRelying: false,
  ...o,
});
const newProv: SourceProvenance[] = [
  pe({ sourceId: "dcwp_dol_labor", name: "Curated labor & employment rules (DOL/DCWP)", module: "labor", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: svLabor, stalenessNote: "Curated authoritative rules; live DCWP + DOL enforcedata enforcement augments when enabled." }),
  pe({ sourceId: "dol_enforcedata", name: "DOL WHD enforcement (enforcedata.dol.gov)", module: "labor", status: "manual", accessType: "bulk-download", endpointOrUrl: "https://enforcedata.dol.gov/views/data_summary.php", oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: "Dormant — set DOL_ENFORCE_KEY + wire the WHD bulk parse. No rows fabricated.", reVerifyBeforeRelying: true }),
  pe({ sourceId: "osha_dob_building", name: "Curated building & occupational-safety standards (OSHA/DOB/ADA)", module: "building", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: svBuilding, stalenessNote: "Curated authoritative standards; live ECB/DOB violation enforcement augments (nyc_dob_violations)." }),
  pe({ sourceId: "osha_establishments", name: "OSHA establishment search / inspections", module: "building", status: "manual", accessType: "official-api", endpointOrUrl: "https://www.osha.gov/ords/imis/establishment.html", oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: "Dormant — wire OSHA establishment-search to brand-match citations. No rows fabricated.", reVerifyBeforeRelying: true }),
  pe({ sourceId: "dep_dsny_env", name: "Curated environmental & sanitation rules (DEP/DSNY/BIC)", module: "environment", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: cnt(environment, "dep_dsny_env"), stalenessNote: "Curated authoritative rules; live DSNY enforcement augments (nyc_dsny_enforcement)." }),
  pe({ sourceId: "dcwp_ftc_consumer", name: "Curated consumer & worker-protection rules (DCWP/FTC)", module: "consumer", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: svConsumer, stalenessNote: "Curated authoritative rules; live DCWP enforcement augments (nyc_dcwp_consumer)." }),
];
// NB: the live-adapter provenance entries (nyc_dob_violations / nyc_dsny_enforcement /
// nyc_dcwp_consumer) are intentionally NOT rebuilt here — they are preserved from prep:collect,
// which stamps the real fetched status + recordCount. Overwriting them with a stub would lie.
const newIds = new Set(newProv.map((p) => p.sourceId));
meta.provenance = [...(meta.provenance as SourceProvenance[]).filter((p) => !newIds.has(p.sourceId)), ...newProv];

writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

console.log(
  `wrote ${labor.length} labor + ${building.length} building + ${environment.length} environment + ${consumer.length} consumer to data/v2/; patched meta.counts + ${newProv.length} provenance entries (snapshot preserved).`,
);
