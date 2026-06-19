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
  ViolationCategoriesFileSchema,
  BrandsFileSchema,
  JurisdictionsFileSchema,
  MetaSchema,
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
  if (missingRef.length || regMissing.length) {
    failed++;
    console.error(
      `  ✗ source-ref integrity: ${missingRef.length} inspections + ${regMissing.length} regulatory marked 'available' but missing a source URL/doc ref`,
    );
  } else {
    console.log("  ✓ source-ref integrity (available records all carry a source ref)");
  }
} catch {
  /* already reported above */
}

if (failed) {
  console.error(`\nVALIDATION FAILED: ${failed} check(s).`);
  process.exit(1);
}
console.log("\nAll /data/v2 files valid.");
