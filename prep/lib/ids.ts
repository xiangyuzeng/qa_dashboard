/** Deterministic ids so re-running the pull is stable and dedupes cleanly. */
import { createHash } from "node:crypto";

export const hashId = (prefix: string, ...parts: (string | number | null | undefined)[]) =>
  `${prefix}-${createHash("sha1")
    .update(parts.map((p) => String(p ?? "")).join("|"))
    .digest("hex")
    .slice(0, 12)}`;

/** Normalize a store/area key for repeat-violation grouping. */
export const normKey = (s: string | null | undefined) =>
  (s ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
