/**
 * Pluggable feed-adapter seam (spec §6). A `FeedAdapter` is a thin descriptor that
 * wraps a collector's EXISTING signature (`() => Promise<SourceResult>`) so a licensed
 * feed can later swap in without touching schema or surfaces — registration, not rewrite.
 *
 * `SourceResult` lives here (instead of inside collect.ts) so this module can be imported
 * without triggering collect.ts's `main()`. Type-only imports from schema → no runtime dep.
 */
import type {
  RegulatoryRecord,
  InspectionRecord,
  ImportExportRecord,
  RegulationRecord,
  SentimentRecord,
  LaborRecord,
  BuildingRecord,
  EnvironmentRecord,
  ConsumerRecord,
  SourceProvenance,
  Module,
} from "../../src/lib/schema";

export type SourceResult = {
  regulatory?: RegulatoryRecord[];
  inspections?: InspectionRecord[];
  importExport?: ImportExportRecord[];
  regulations?: RegulationRecord[];
  sentiment?: SentimentRecord[];
  // ── V2.5 compliance domains ──
  labor?: LaborRecord[];
  building?: BuildingRecord[];
  environment?: EnvironmentRecord[];
  consumer?: ConsumerRecord[];
  provenance: SourceProvenance;
};

/**
 * A swappable feed. `fetch()` returns the identical `SourceResult` collectors already
 * produce, so the dormant-gate / try-catch / provEntry patterns are reused verbatim.
 * A licensed feed swaps in by replacing one adapter's `fetch` — nothing in schema,
 * the validators, or the app changes because the output records keep their types.
 */
export interface FeedAdapter {
  /** stable sourceId, e.g. "dol_enforcedata". */
  id: string;
  /** which module key the records land under. */
  module: Module;
  /** SAME contract existing collectors return; self-gates dormancy internally. */
  fetch: () => Promise<SourceResult>;
  /** optional declarative gate (informational; fetch still self-gates + returns a truthful stub). */
  enabled?: () => boolean;
}
