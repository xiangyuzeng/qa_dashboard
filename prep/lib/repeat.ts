/**
 * Repeat-violation grouping: the same STORE repeating the same standardized category across ≥2
 * inspections. Runs in prep:merge over the whole store (today's pull + kept history), so a repeat is
 * found even when the earlier inspection is no longer in today's sample. Café-★ categories (17/18)
 * also raise the café-repeat flag.
 *
 * Add-only, so re-running over records that already carry the flags changes nothing. The group label
 * is our own id of the group's earliest-seen member — no hash of store names or addresses.
 */
import { normKey } from "./ids";
import type { InspectionRecord } from "../../src/lib/schema";

export function applyRepeatGroups(inspections: InspectionRecord[]): number {
  const groups = new Map<string, InspectionRecord[]>();
  for (const r of inspections) {
    if (r.standardizedCategoryId == null || !r.storeName) continue;
    // address makes the key location-specific (NYC/Boston `dba` is the brand name, not a store).
    const key = `${normKey(`${r.storeName} ${r.address ?? ""}`)}|${r.jurisdiction}|${r.standardizedCategoryId}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }
  let flagged = 0;
  for (const rows of groups.values()) {
    if (rows.length < 2) continue;
    const first = [...rows].sort(
      (a, b) => (a.provenance.firstSeenAt ?? "").localeCompare(b.provenance.firstSeenAt ?? "") || a.id.localeCompare(b.id),
    )[0];
    const gid = `rg-${first.id}`;
    const cafeRepeat = rows[0].standardizedCategoryId === 17 || rows[0].standardizedCategoryId === 18;
    for (const r of rows) {
      r.repeatViolationGroupId = gid;
      if (r.alertRuleIds.includes("repeat.same")) continue;
      r.alertRuleIds.push("repeat.same");
      if (cafeRepeat) r.alertRuleIds.push("cafe.repeat");
      r.alertTriggered = true;
      r.alertReason = [r.alertReason, "repeat violation (same store + category)"].filter(Boolean).join("; ");
      if (r.riskLevel === "低风险") r.riskLevel = "中风险";
      flagged++;
    }
  }
  return flagged;
}
