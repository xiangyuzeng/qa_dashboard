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

type WithProvenance = { provenance?: { sourceId?: string | null } | null };

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
