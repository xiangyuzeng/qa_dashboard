/**
 * Where each pipeline step reads and writes.
 *
 *   data/v2/      the published store — records with OUR ids, plus persistent files (id registry,
 *                 review overrides, translation cache, store roster…). Only prep:merge writes the
 *                 record files here.
 *   .prep/stage/  today's pull — collect / enrich / domains / translate write records here with the
 *                 source's own identifier in provenance.externalKey and no id yet (UNASSIGNED_ID).
 *                 Not committed.
 */
import { join, resolve } from "node:path";

export const DATA_DIR = join(process.cwd(), "data", "v2");
export const STAGE_DIR = process.env.PREP_STAGE_DIR ? resolve(process.env.PREP_STAGE_DIR) : join(process.cwd(), ".prep", "stage");

/** Record files that carry ids (one per module). */
export const RECORD_FILES = [
  "regulatory.json", "inspections.json", "import_export.json", "regulations.json", "sentiment.json",
  "labor.json", "building.json", "environment.json", "consumer.json",
] as const;

/** Placeholder id on staged records — prep:merge replaces it with our own id from the registry. */
export const UNASSIGNED_ID = "unassigned";

/**
 * The source system's identity for a record, namespaced by that system — e.g. `oath:0184526F0`,
 * `nyc-dohmh:50178654|2026-02-17`, `fedreg:2026-12345`. Recorded so we can match a record across
 * refreshes and exchange data with the source; it is NEVER used to build our own id.
 */
export const extKey = (ns: string, ...parts: (string | number | null | undefined)[]): string =>
  `${ns}:${parts.map((p) => String(p ?? "").replace(/\s+/g, " ").trim()).join("|")}`;
