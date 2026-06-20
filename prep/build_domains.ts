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

const OUT = join(process.cwd(), "data", "v2");
const NOW = new Date().toISOString();
const load = (f: string) => JSON.parse(readFileSync(join(OUT, f), "utf8"));
const isServable = (r: { reviewed: boolean; reviewStatus: string }) => r.reviewed && r.reviewStatus !== "rejected";

const labor = buildLaborRecords();
const building = buildBuildingRecords();
const environment = buildEnvironmentRecords();
const consumer = buildConsumerRecords();

labor.forEach((r, i) => (r.no = i + 1));
building.forEach((r, i) => (r.no = i + 1));
environment.forEach((r, i) => (r.no = i + 1));
consumer.forEach((r, i) => (r.no = i + 1));

// Stamp appliesToUs from the engine (labor/environment/consumer; building is premises-universal).
const profile = CompanyProfileSchema.parse(load("company_profile.json"));
const rules = ApplicabilityRulesFileSchema.parse(load("applicability_rules.json"));
stampAppliesToUs([...labor, ...environment, ...consumer], profile, rules);

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
meta.counts.bySource["dcwp_dol_labor"] = svLabor;
meta.counts.bySource["osha_dob_building"] = svBuilding;
meta.counts.bySource["dep_dsny_env"] = svEnv;
meta.counts.bySource["dcwp_ftc_consumer"] = svConsumer;

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
  pe({ sourceId: "osha_dob_building", name: "Curated building & occupational-safety standards (OSHA/DOB/ADA)", module: "building", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: svBuilding, stalenessNote: "Curated authoritative standards; live OSHA establishment + DOB violation enforcement augments when enabled." }),
  pe({ sourceId: "osha_establishments", name: "OSHA establishment search / inspections", module: "building", status: "manual", accessType: "official-api", endpointOrUrl: "https://www.osha.gov/ords/imis/establishment.html", oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: "Dormant — wire OSHA establishment-search to brand-match citations. No rows fabricated.", reVerifyBeforeRelying: true }),
  pe({ sourceId: "nyc_dob_violations", name: "NYC DOB/ECB violations (NYC Open Data)", module: "building", status: "manual", accessType: "open-data", endpointOrUrl: "https://data.cityofnewyork.us/resource/3h2n-5cm9.json", oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: "Dormant — verify dataset id + address-match to owned stores before enabling. No rows fabricated.", reVerifyBeforeRelying: true }),
  pe({ sourceId: "dep_dsny_env", name: "Curated environmental & sanitation rules (DEP/DSNY/BIC)", module: "environment", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: svEnv, stalenessNote: "Curated authoritative rules; live DSNY enforcement augments when a verified dataset is wired." }),
  pe({ sourceId: "nyc_dsny_enforcement", name: "NYC DSNY commercial-waste enforcement", module: "environment", status: "manual", accessType: "open-data", endpointOrUrl: "https://data.cityofnewyork.us/browse?q=DSNY%20enforcement", oneTimePullFeasible: "no", recordCount: 0, stalenessNote: "Dormant — DSNY enforcement is not consistently on Socrata; verify a dataset or use manual intake. No rows fabricated.", reVerifyBeforeRelying: true }),
  pe({ sourceId: "dcwp_ftc_consumer", name: "Curated consumer & worker-protection rules (DCWP/FTC)", module: "consumer", status: "manual", accessType: "none", oneTimePullFeasible: "partial", recordCount: svConsumer, stalenessNote: "Curated authoritative rules; live DCWP consumer-complaint dataset augments when a verified id is wired." }),
  pe({ sourceId: "nyc_dcwp_consumer", name: "NYC DCWP consumer complaints / inspections (NYC Open Data)", module: "consumer", status: "manual", accessType: "open-data", endpointOrUrl: "https://data.cityofnewyork.us/browse?q=DCWP%20consumer%20complaints", oneTimePullFeasible: "partial", recordCount: 0, stalenessNote: "Dormant — verify the DCWP consumer-complaint dataset id + brand-match before enabling. No rows fabricated.", reVerifyBeforeRelying: true }),
];
const newIds = new Set(newProv.map((p) => p.sourceId));
meta.provenance = [...(meta.provenance as SourceProvenance[]).filter((p) => !newIds.has(p.sourceId)), ...newProv];

writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

console.log(
  `wrote ${labor.length} labor + ${building.length} building + ${environment.length} environment + ${consumer.length} consumer to data/v2/; patched meta.counts + ${newProv.length} provenance entries (snapshot preserved).`,
);
