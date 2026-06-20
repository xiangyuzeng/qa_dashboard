/**
 * Validate every committed /data/v2 file against the canonical Zod contract.
 * Run in CI / before commit (the human-review gate stays meaningful: malformed or
 * fabricated-shaped data fails loudly). Exits non-zero on any failure.
 *
 * Run: npm run prep:validate
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RegulatoryFileSchema,
  InspectionFileSchema,
  ImportExportFileSchema,
  RegulationFileSchema,
  SentimentFileSchema,
  LaborFileSchema,
  BuildingFileSchema,
  EnvironmentFileSchema,
  ConsumerFileSchema,
  OwnedStoresFileSchema,
  CompanyProfileSchema,
  ApplicabilityRulesFileSchema,
  ApplicabilityVerdictsFileSchema,
  ViolationCategoriesFileSchema,
  BrandsFileSchema,
  JurisdictionsFileSchema,
  MetaSchema,
  SHEET1_COLUMNS,
  SHEET2_COLUMNS,
  SHEET3_COLUMNS,
  SHEET4_COLUMNS,
  SHEET5_COLUMNS,
  SHEET6_COLUMNS,
  SHEET7_COLUMNS,
  SHEET8_COLUMNS,
} from "../src/lib/schema";

const DIR = join(process.cwd(), "data", "v2");
const load = (f: string) => JSON.parse(readFileSync(join(DIR, f), "utf8"));

type Check = { file: string; run: () => unknown };
const checks: Check[] = [
  { file: "violation_categories.json", run: () => ViolationCategoriesFileSchema.parse(load("violation_categories.json")) },
  { file: "brands.json", run: () => BrandsFileSchema.parse(load("brands.json")) },
  { file: "jurisdictions.json", run: () => JurisdictionsFileSchema.parse(load("jurisdictions.json")) },
  { file: "regulatory.json", run: () => RegulatoryFileSchema.parse(load("regulatory.json")) },
  { file: "inspections.json", run: () => InspectionFileSchema.parse(load("inspections.json")) },
  { file: "import_export.json", run: () => ImportExportFileSchema.parse(load("import_export.json")) },
  { file: "regulations.json", run: () => RegulationFileSchema.parse(load("regulations.json")) },
  { file: "sentiment.json", run: () => SentimentFileSchema.parse(load("sentiment.json")) },
  // ── V2.5 compliance domains + engine inputs ──
  { file: "labor.json", run: () => LaborFileSchema.parse(load("labor.json")) },
  { file: "building.json", run: () => BuildingFileSchema.parse(load("building.json")) },
  { file: "environment.json", run: () => EnvironmentFileSchema.parse(load("environment.json")) },
  { file: "consumer.json", run: () => ConsumerFileSchema.parse(load("consumer.json")) },
  { file: "owned_stores.json", run: () => OwnedStoresFileSchema.parse(load("owned_stores.json")) },
  { file: "company_profile.json", run: () => CompanyProfileSchema.parse(load("company_profile.json")) },
  { file: "applicability_rules.json", run: () => ApplicabilityRulesFileSchema.parse(load("applicability_rules.json")) },
  { file: "applicability_verdicts.json", run: () => ApplicabilityVerdictsFileSchema.parse(load("applicability_verdicts.json")) },
  { file: "meta.json", run: () => MetaSchema.parse(load("meta.json")) },
];

let failed = 0;
const counts: Record<string, number> = {};
for (const c of checks) {
  try {
    const parsed = c.run();
    counts[c.file] = Array.isArray(parsed) ? parsed.length : 1;
    console.log(`  ✓ ${c.file}${Array.isArray(parsed) ? ` (${parsed.length} records)` : ""}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${c.file}`);
    console.error(String(err).split("\n").slice(0, 12).join("\n"));
  }
}

// Cross-file integrity: every inspection with dataAvailability='available' must keep a source ref (no fabrication).
try {
  const insp = InspectionFileSchema.parse(load("inspections.json"));
  const reg = RegulatoryFileSchema.parse(load("regulatory.json"));
  const missingRef = insp.filter(
    (r) =>
      r.provenance.dataAvailability === "available" &&
      !r.sourceUrlOrDocRef &&
      !r.provenance.sourceUrl &&
      !r.provenance.docRef,
  );
  const regMissing = reg.filter((r) => r.provenance.dataAvailability === "available" && !r.sourceUrl && !r.provenance.sourceUrl);
  // V2.5 — every available compliance-domain record must carry a source ref too (no fabrication).
  const domainMissing = [
    ...LaborFileSchema.parse(load("labor.json")),
    ...BuildingFileSchema.parse(load("building.json")),
    ...EnvironmentFileSchema.parse(load("environment.json")),
    ...ConsumerFileSchema.parse(load("consumer.json")),
  ].filter((r) => r.provenance.dataAvailability === "available" && !r.sourceUrl && !r.provenance.sourceUrl && !r.provenance.docRef);
  if (missingRef.length || regMissing.length || domainMissing.length) {
    failed++;
    console.error(
      `  ✗ source-ref integrity: ${missingRef.length} inspections + ${regMissing.length} regulatory + ${domainMissing.length} compliance-domain records marked 'available' but missing a source URL/doc ref`,
    );
  } else {
    console.log("  ✓ source-ref integrity (available records all carry a source ref)");
  }
} catch {
  /* already reported above */
}

// Id-uniqueness guard: no duplicate record ids within a file, and no collisions across the
// record-bearing files (ids are used as React keys + detail-page slugs + cross-refs, so a
// collision silently drops/merges rows). Catches e.g. EN/ES recall pairs hashing to one id.
const idFiles = [
  "regulatory.json", "inspections.json", "import_export.json", "regulations.json", "sentiment.json",
  "labor.json", "building.json", "environment.json", "consumer.json", "applicability_rules.json",
];
const seenGlobal = new Map<string, string>();
let idProblems = 0;
for (const f of idFiles) {
  let rows: unknown;
  try {
    rows = load(f);
  } catch {
    continue;
  }
  if (!Array.isArray(rows)) continue;
  const within = new Set<string>();
  for (const r of rows as { id?: string }[]) {
    const id = r?.id;
    if (!id) continue;
    if (within.has(id)) {
      idProblems++;
      console.error(`  ✗ duplicate id within ${f}: ${id}`);
    }
    within.add(id);
    const prev = seenGlobal.get(id);
    if (prev && prev !== f) {
      idProblems++;
      console.error(`  ✗ id collision across files: ${id} in both ${prev} and ${f}`);
    }
    seenGlobal.set(id, f);
  }
}
if (idProblems) {
  failed++;
} else {
  console.log(`  ✓ id uniqueness (no dup/collision across ${idFiles.length} record files)`);
}

// Export-column drift guard: the Python exporter (prep/export_xlsx.py) hardcodes the same
// column orders. Print + assert the lengths so any schema reorder shows up next to the
// Python asserts in one `prep:build` run (see docs/DATA_CONTRACT.md "7-sheet export").
const sheetLens = {
  SHEET1: SHEET1_COLUMNS.length,
  SHEET2: SHEET2_COLUMNS.length,
  SHEET3: SHEET3_COLUMNS.length,
  SHEET4: SHEET4_COLUMNS.length,
  SHEET5: SHEET5_COLUMNS.length,
  SHEET6: SHEET6_COLUMNS.length,
  SHEET7: SHEET7_COLUMNS.length,
  SHEET8: SHEET8_COLUMNS.length,
};
const expectedLens = { SHEET1: 12, SHEET2: 23, SHEET3: 16, SHEET4: 16, SHEET5: 18, SHEET6: 19, SHEET7: 17, SHEET8: 15 };
if (JSON.stringify(sheetLens) === JSON.stringify(expectedLens)) {
  console.log(`  ✓ export columns: SHEET1..8 lengths = ${Object.values(sheetLens).join("/")} (mirror prep/export_xlsx.py)`);
} else {
  failed++;
  console.error(`  ✗ export columns drift: got ${JSON.stringify(sheetLens)}, expected ${JSON.stringify(expectedLens)} — update prep/export_xlsx.py SHEET*_COLS to match`);
}

if (failed) {
  console.error(`\nVALIDATION FAILED: ${failed} check(s).`);
  process.exit(1);
}
console.log("\nAll /data/v2 files valid.");
