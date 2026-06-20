/**
 * Applicability / Threshold Engine — THE hero. Pure, dependency-free function:
 * it imports ONLY `type`s (erased at compile), so it is safe to import into a
 * `"use client"` bundle, into server pages, AND into `prep/collect.ts` (Node).
 * Single source of truth — no duplication across those three contexts.
 *
 * The cardinal rule (spec §7): read the SPECIFIC footprint count a rule needs —
 * NEVER collapse the footprint to one number. Null required inputs render
 * 待补充 Pending data and are excluded from the applies/approaching verdict.
 */
import type {
  CompanyProfile,
  ApplicabilityRule,
  ApplicabilityStatus,
  CountBasis,
} from "./schema";

export type ApplicabilityVerdict = {
  rule: ApplicabilityRule;
  /** the specific count/sqft this rule reads (null ⇒ 待补充, never guessed). */
  ourValue: number | null;
  threshold: number | null;
  status: ApplicabilityStatus;
  /** signed gap to threshold in the rule's unit (+ over, − below); null when pending. */
  distance: number | null;
  /** true when a required input was null (or rule needs verification). */
  pending: boolean;
  /** the count basis actually used (for location_count / fair_workweek). */
  basisUsed: CountBasis | null;
};

/** within this ratio of the threshold (but below it) ⇒ "approaching". */
export const APPROACH_RATIO = 0.8;

/** Read the specific national count a rule's basis selects — NOT collapsed to one number. */
export function nationalCount(profile: CompanyProfile, basis: CountBasis): number | null {
  const n = profile.national;
  switch (basis) {
    case "open":
      return n.openLocationCount ?? null;
    case "open_planned":
      return n.openLocationCount == null || n.plannedLocationCount == null
        ? null
        : n.openLocationCount + n.plannedLocationCount;
    case "all_status":
      return n.retailLocationCountAllStatuses ?? null;
  }
}

function pendingVerdict(
  rule: ApplicabilityRule,
  value: number | null,
  basisUsed: CountBasis | null = null,
): ApplicabilityVerdict {
  return { rule, ourValue: value, threshold: rule.threshold, status: "na", distance: null, pending: true, basisUsed };
}

function verdictFromNumber(
  rule: ApplicabilityRule,
  value: number | null,
  threshold: number | null,
  basisUsed: CountBasis | null = null,
): ApplicabilityVerdict {
  if (value == null || threshold == null) return pendingVerdict(rule, value, basisUsed);
  const distance = value - threshold; // signed: +ve over, −ve below
  let status: ApplicabilityStatus;
  if (value >= threshold) status = "applies";
  else if (value >= threshold * APPROACH_RATIO) status = "approaching";
  else status = "not_yet";
  return { rule, ourValue: value, threshold, status, distance, pending: false, basisUsed };
}

/**
 * Evaluate every rule against the footprint. `opts.fairWorkweekBasis` lets the UI
 * toggle the Fair-Workweek count basis (open / open+planned / all-status) since
 * Luckin sits on the line (18 / 25 / 30).
 */
export function evaluate(
  profile: CompanyProfile,
  rules: ApplicabilityRule[],
  opts?: { fairWorkweekBasis?: CountBasis },
): ApplicabilityVerdict[] {
  return rules.map((rule) => {
    switch (rule.triggerDimension) {
      case "location_count": {
        const value = nationalCount(profile, rule.countBasis);
        return verdictFromNumber(rule, value, rule.threshold, rule.countBasis);
      }

      case "is_fast_food_model": {
        // Fair Workweek: a count threshold (at the active basis) AND the fast-food gate.
        const basis = opts?.fairWorkweekBasis ?? rule.countBasis;
        const value = nationalCount(profile, basis);
        const isFF = profile.isFastFoodModel;
        if (value == null || isFF == null) return pendingVerdict(rule, value, basis);
        if (!isFF) {
          return { rule, ourValue: value, threshold: rule.threshold, status: "not_yet", distance: null, pending: false, basisUsed: basis };
        }
        return verdictFromNumber(rule, value, rule.threshold, basis);
      }

      case "combined_site_sqft": {
        // Organics chain: 2+ sites in the jurisdiction AND combined sqft ≥ threshold.
        const j = profile.jurisdictions.find((x) => x.jurisdiction === rule.jurisdiction);
        const sites = j?.locationCount ?? null;
        const sqft = j?.combinedFloorAreaSqft ?? null;
        if (sites == null || sqft == null) return pendingVerdict(rule, sqft);
        if (sites < 2) {
          return { rule, ourValue: sqft, threshold: rule.threshold, status: "not_yet", distance: null, pending: false, basisUsed: null };
        }
        return verdictFromNumber(rule, sqft, rule.threshold);
      }

      case "single_site_sqft": {
        // Organics single-site: the largest single store vs the threshold.
        const maxSqft = profile.floorArea.perStoreMaxSqft ?? null;
        return verdictFromNumber(rule, maxSqft, rule.threshold);
      }

      case "always":
        return { rule, ourValue: null, threshold: null, status: "always", distance: null, pending: false, basisUsed: null };

      case "needs_verification":
        return pendingVerdict(rule, null);
    }
  });
}

/** Whether a verdict counts as "this obligation applies to us" (for appliesToUs stamping + alerts). */
export function isApplicable(status: ApplicabilityStatus): boolean {
  return status === "applies" || status === "approaching" || status === "always";
}

/** Add a delta to a nullable number, preserving null (so what-if nudging a pending field stays pending). */
export function clampAdd(value: number | null, delta: number, min = 0): number | null {
  if (value == null) return null;
  return Math.max(min, value + delta);
}
