// Record ids are issued by prep:merge from data/v2/id_registry.json — never computed from source data.
// The source's own identifier goes in provenance.externalKey (see ./stage.ts extKey).

/** Normalize a name/identifier for matching (repeat-violation grouping, bill numbers). */
export const normKey = (s: string | null | undefined) =>
  (s ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
