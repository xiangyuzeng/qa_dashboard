/**
 * Which module rows are a static curated baseline vs. a live feed — decided from provenance
 * source id, not a hardcoded per-module flag. This keeps the "policy baseline · not real-time"
 * notice honest: it shows only while EVERY servable row comes from a curated seed source, and
 * auto-clears the moment a live enforcement collector is wired (those rows carry a non-curated
 * sourceId). See docs/API_KEYS.md for the dormant collectors that would flip these modules live.
 */

/** Curated-seed source ids (transcribed authoritative rules / May-2026 report / manual intake). */
export const CURATED_SOURCE_IDS = new Set<string>([
  "dcwp_dol_labor", // labor
  "osha_dob_building", // building
  "dep_dsny_env", // environment
  "dcwp_ftc_consumer", // consumer
  "may_report_regulation", // state/local regulation
  "may_report_import", // import (partial)
  "manual_intake", // inspections (partial)
]);

/**
 * Live enforcement source ids: real summonses/violations issued to us, collected INTO the
 * domain modules (environment/building/consumer) but conceptually NOT regulations. The data
 * layer routes these to the dedicated /enforcement view and keeps domain pages regulations-only.
 */
export const ENFORCEMENT_SOURCE_IDS = new Set<string>([
  "nyc_dsny_enforcement", // environment — DSNY sanitation summonses (OATH)
  "nyc_dob_violations", // building — DOB/ECB violations
  "nyc_dcwp_consumer", // consumer — DCWP summonses (OATH)
]);

type WithProvenance = { provenance?: { sourceId?: string | null } | null };

/** True when the record is a live enforcement action (a penalty), not a regulation. */
export function isEnforcement(r: WithProvenance): boolean {
  const sid = r.provenance?.sourceId ?? null;
  return sid != null && ENFORCEMENT_SOURCE_IDS.has(sid);
}

/**
 * True when every record comes from a curated seed source (no live-fetched rows) — i.e. the module
 * is a static policy baseline that does NOT change on the daily refresh, despite the site's
 * "as of" date. Empty input is not treated as a baseline.
 */
export function isStaticBaseline(records: WithProvenance[]): boolean {
  return (
    records.length > 0 &&
    records.every((r) => {
      const sid = r.provenance?.sourceId ?? null;
      return sid != null && CURATED_SOURCE_IDS.has(sid);
    })
  );
}
