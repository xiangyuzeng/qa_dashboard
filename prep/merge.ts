/**
 * prep:merge — the ONLY step that gives records an id, and the step that turns a refresh into an
 * update of the published store instead of a rebuild.
 *
 * Inputs : .prep/stage/*.json        today's pull (records keyed by provenance.externalKey, no id yet)
 *          data/v2/*.json            the published store from the previous refresh
 *          data/v2/id_registry.json  (module, externalKey) → our id
 *          data/v2/review_overrides.json  manual review decisions, by our id
 * Output : data/v2/*.json, data/v2/id_registry.json, data/v2/meta.json (counts: prep:meta)
 *
 * Rules
 *  - Ids are ours: a key seen before keeps its id forever; a new key gets a newly issued random id.
 *    The source's identifier stays in provenance.externalKey for matching and data exchange only.
 *  - Returned today → content updated, lastSeenAt = now, sourceState "current".
 *  - Its source FAILED today → the stored record is kept unchanged (a failed pull says nothing).
 *  - Source pulled fine but did not return it → kept, never deleted:
 *      · complete sources (curated seeds, manual intake, summonses issued to us) — every pull lists
 *        everything, so absence counts: "missing" ("来源已 N 天未返回"), and after 3 consecutive
 *        successful pulls "withdrawn" ("来源已撤下");
 *      · sampled sources (newest-N windows) — absence counts only if the record is still inside the
 *        window today's pull covered; older ones were just pushed out of the sample → "history".
 *  - Current-state records (an owned store "awaiting first inspection") end when the source stops
 *    returning them — the store got its first real inspection — so they are dropped, not kept.
 *  - A duplicate externalKey within one module's pull is an error (two records claiming one identity).
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, RECORD_FILES, STAGE_DIR, UNASSIGNED_ID } from "./lib/stage";
import { applyRepeatGroups } from "./lib/repeat";
import { CURATED_SOURCE_IDS } from "../src/lib/dataMode";
import type { InspectionRecord, SourceProvenance } from "../src/lib/schema";

const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);
const WITHDRAWN_AFTER = 3; // consecutive successful pulls without the record

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any> & { id: string; provenance: Record<string, any> };
type Registry = Record<string, Record<string, string>>; // module file stem → externalKey → id
type Override = { reviewed?: boolean; reviewStatus?: string; reviewNote?: string | null };

const PREFIX: Record<string, string> = {
  regulatory: "reg", inspections: "insp", import_export: "imp", regulations: "reg2", sentiment: "sent",
  labor: "labor", building: "bldg", environment: "env", consumer: "cons",
};
const COMPLETE_SOURCES = new Set<string>([
  ...CURATED_SOURCE_IDS,
  "nyc_dohmh_oath", "nyc_dsny_enforcement", "nyc_dob_violations", "nyc_dcwp_consumer",
]);
const STATE_SOURCES = new Set<string>(["nyc_dohmh_registered"]);

const readJson = <T>(path: string, fallback: T): T => (existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback);
const writeJson = (path: string, v: unknown) => writeFileSync(path, JSON.stringify(v, null, 2) + "\n");

const dateOf = (stem: string, r: Rec): string | null => {
  const d =
    stem === "inspections" ? r.inspectionDate
    : stem === "regulations" ? (r.publicationPassageDate ?? r.effectiveDate)
    : stem === "regulatory" || stem === "import_export" || stem === "sentiment" ? r.publicationDate
    : r.effectiveDate;
  return typeof d === "string" && d ? d.slice(0, 10) : null;
};
// the unit a sampled source's window applies to (per brand × issuing agency for inspections)
const windowGroup = (stem: string, r: Rec) =>
  stem === "inspections" ? `${r.provenance.sourceId}|${r.brand ?? ""}|${r.regulatoryAgency ?? ""}` : String(r.provenance.sourceId);
const daysBetween = (fromIso: string, toDay: string) =>
  Math.max(0, Math.round((Date.parse(toDay) - Date.parse(fromIso.slice(0, 10))) / 86400000));

const registry = readJson<Registry>(join(DATA_DIR, "id_registry.json"), {});
const overrides = readJson<Record<string, Override>>(join(DATA_DIR, "review_overrides.json"), {});
const stageMeta = readJson<{ provenance?: SourceProvenance[] }>(join(STAGE_DIR, "meta.json"), {});
const provBySid = new Map((stageMeta.provenance ?? []).map((p) => [p.sourceId, p]));

const taken = new Set<string>(Object.values(registry).flatMap((m) => Object.values(m)));
const mint = (prefix: string): string => {
  for (;;) {
    const id = `${prefix}-${randomBytes(6).toString("hex")}`;
    if (!taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
};

let problems = 0;
const report: string[] = [];
const pending: [string, unknown][] = []; // written only if every module merged cleanly

for (const file of RECORD_FILES) {
  const stem = file.replace(/\.json$/, "");
  const reg = (registry[stem] ??= {});
  const prev = readJson<Rec[]>(join(DATA_DIR, file), []);
  const today = readJson<Rec[]>(join(STAGE_DIR, file), []);

  // ── source health today: produced rows, or explicitly found nothing new; otherwise treat as failed
  const countBySid = new Map<string, number>();
  for (const t of today) countBySid.set(t.provenance.sourceId, (countBySid.get(t.provenance.sourceId) ?? 0) + 1);
  const sourceOk = (sid: string) => {
    if ((countBySid.get(sid) ?? 0) > 0) return true;
    const p = provBySid.get(sid);
    return !!p && p.status === "no_update" && !/pull failed/i.test(p.stalenessNote ?? "");
  };
  // oldest date today's pull reached per window group (sampled sources)
  const floor = new Map<string, string>();
  for (const t of today) {
    const d = dateOf(stem, t);
    const g = windowGroup(stem, t);
    if (d && (!floor.has(g) || d < floor.get(g)!)) floor.set(g, d);
  }

  const prevByKey = new Map<string, Rec>();
  for (const p of prev) {
    const k = p.provenance?.externalKey;
    if (!k) {
      console.error(`  ✗ ${file}: stored record ${p.id} has no externalKey`);
      problems++;
      continue;
    }
    prevByKey.set(k, p);
    if (reg[k] && reg[k] !== p.id) {
      console.error(`  ✗ ${file}: registry maps ${k} → ${reg[k]} but the store has ${p.id}`);
      problems++;
    }
    reg[k] ??= p.id;
    taken.add(p.id);
  }

  const out: Rec[] = [];
  const seen = new Set<string>();
  let minted = 0;
  for (const t of today) {
    const k = t.provenance?.externalKey;
    if (!k) {
      console.error(`  ✗ ${file}: staged ${t.provenance?.sourceId} record without externalKey`);
      problems++;
      continue;
    }
    if (seen.has(k)) {
      console.error(`  ✗ ${file}: duplicate externalKey ${k} in today's pull`);
      problems++;
      continue;
    }
    seen.add(k);
    const p = prevByKey.get(k);
    if (!reg[k]) {
      reg[k] = mint(PREFIX[stem]);
      minted++;
    }
    t.id = reg[k];
    t.provenance.firstSeenAt = p?.provenance.firstSeenAt ?? NOW;
    t.provenance.lastSeenAt = NOW;
    t.provenance.missingRuns = 0;
    t.provenance.notReturnedDays = null;
    t.provenance.sourceState = "current";
    out.push(t);
  }

  const kept: Rec[] = [];
  const tally = { unchanged: 0, missing: 0, withdrawn: 0, history: 0, dropped: 0 };
  for (const p of prev) {
    const k = p.provenance?.externalKey;
    if (!k || seen.has(k)) continue;
    const sid = String(p.provenance.sourceId);
    if (!sourceOk(sid)) {
      tally.unchanged++; // failed pull: keep exactly as last published
    } else if (STATE_SOURCES.has(sid)) {
      tally.dropped++; // the state it described has ended
      continue;
    } else {
      const d = dateOf(stem, p);
      const f = floor.get(windowGroup(stem, p));
      // strictly newer than the oldest date today's sample reached: records ON that date compete with
      // ties for the last newest-N slots, so their absence says nothing about the source
      const inRange = COMPLETE_SOURCES.has(sid) || !d || (f != null && d > f);
      if (inRange) {
        p.provenance.missingRuns = (p.provenance.missingRuns ?? 0) + 1;
        p.provenance.sourceState = p.provenance.missingRuns >= WITHDRAWN_AFTER ? "withdrawn" : "missing";
        p.provenance.notReturnedDays = p.provenance.lastSeenAt ? daysBetween(p.provenance.lastSeenAt, TODAY) : null;
        tally[p.provenance.sourceState === "withdrawn" ? "withdrawn" : "missing"]++;
      } else {
        p.provenance.missingRuns = 0;
        p.provenance.notReturnedDays = null;
        p.provenance.sourceState = "history";
        tally.history++;
      }
    }
    kept.push(p);
  }
  kept.sort((a, b) => (dateOf(stem, b) ?? "").localeCompare(dateOf(stem, a) ?? "") || a.id.localeCompare(b.id));

  const merged = [...out, ...kept];
  merged.forEach((r, i) => (r.no = i + 1));
  for (const r of merged) {
    const o = overrides[r.id];
    if (!o) continue;
    if (o.reviewed !== undefined) r.reviewed = o.reviewed;
    if (o.reviewStatus !== undefined) r.reviewStatus = o.reviewStatus;
    if (o.reviewNote !== undefined) r.reviewNote = o.reviewNote;
  }
  let repeats = 0;
  if (stem === "inspections") repeats = applyRepeatGroups(merged as unknown as InspectionRecord[]);
  if (merged.some((r) => r.id === UNASSIGNED_ID)) {
    console.error(`  ✗ ${file}: a record still carries the placeholder id`);
    problems++;
  }

  pending.push([join(DATA_DIR, file), merged]);
  report.push(
    `  ${file}: ${out.length} from today (${minted} new id${minted === 1 ? "" : "s"}) · kept ${kept.length}` +
      ` (source failed ${tally.unchanged}, not returned ${tally.missing}, withdrawn ${tally.withdrawn}, history ${tally.history})` +
      (tally.dropped ? ` · ${tally.dropped} ended state record(s) removed` : "") +
      (repeats ? ` · ${repeats} repeat flag(s)` : ""),
  );
}

if (problems) {
  console.error(`\nmerge: ${problems} problem(s) — store NOT updated consistently, fix the collectors.`);
  process.exit(1);
}

for (const [path, value] of pending) writeJson(path, value);
// stable key order → readable diffs
const sorted: Registry = {};
for (const m of Object.keys(registry).sort()) {
  sorted[m] = Object.fromEntries(Object.entries(registry[m]).sort(([a], [b]) => a.localeCompare(b)));
}
writeJson(join(DATA_DIR, "id_registry.json"), sorted);
// this run's provenance + summary (prep:meta recomputes the counts and the high-risk list from the store)
if (existsSync(join(STAGE_DIR, "meta.json"))) writeFileSync(join(DATA_DIR, "meta.json"), readFileSync(join(STAGE_DIR, "meta.json")));

console.log("merge:");
for (const line of report) console.log(line);
