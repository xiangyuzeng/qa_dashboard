/**
 * review_gate.ts — the HARD layer of the manual-review gate (spec §10).
 *
 * Moves high-stakes records to reviewStatus:"pending" (reviewed:false) so data.ts's
 * isServable holds them OUT of every module view until a human approves them; they then
 * surface only in /review (getPendingRecords). Staged on purpose — run DELIBERATELY:
 *
 *   npm run prep:gate            # dry-run: list what WOULD be gated, change nothing
 *   npm run prep:gate -- --apply # set reviewStatus:"pending" on those records
 *
 * After --apply, re-run `npm run prep:meta` (counts) + `npm run prep:export`.
 * To release an approved record, set its reviewStatus back to "approved" (e.g. from the
 * /review queue's exported decisions JSON) and rebuild.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "data/v2");
const apply = process.argv.includes("--apply");

const SEVERE = new Set(["Closed", "Permit Suspended", "Stop Sale"]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function gateReason(r: any): string | null {
  if (r.inspectionResult && SEVERE.has(r.inspectionResult)) return "enforcement action (closure/suspension/stop-sale)";
  if ((r.establishmentType ?? "").includes("甲方门店") && r.riskLevel === "高风险") return "owned-store high-risk inspection";
  return null;
}

const file = join(OUT, "inspections.json");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rows: any[] = JSON.parse(readFileSync(file, "utf8"));

let gated = 0;
for (const r of rows) {
  const reason = gateReason(r);
  if (!reason) continue;
  if (r.reviewStatus === "pending") continue; // idempotent
  gated++;
  console.log(`  ${apply ? "GATE" : "would gate"}: ${r.id} — ${(r.storeName ?? "").slice(0, 36)} [${reason}]`);
  if (apply) {
    r.reviewStatus = "pending";
    r.reviewed = false;
    r.reviewNote = `held for manual review: ${reason}`;
  }
}

if (apply && gated > 0) {
  writeFileSync(file, JSON.stringify(rows, null, 2) + "\n");
  console.log(`\nGated ${gated} record(s) to reviewStatus:"pending". Now run: npm run prep:meta && npm run prep:export`);
} else if (apply) {
  console.log("\nNothing to gate (all already pending or no matches).");
} else {
  console.log(`\nDry-run: ${gated} record(s) match the hard gate. Re-run with --apply to set them pending.`);
}
