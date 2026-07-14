/**
 * Source-URL liveness check for every committed /data/v2 record.
 *
 * WHY THIS IS SEPARATE FROM prep:validate — validate.ts is a hermetic, offline build
 * gate (it must never fail on network weather, or scheduled refreshes freeze — see the
 * 2026-07 frozen-refresh incident). Link rot is a *data-quality* signal, not a build
 * blocker, so it runs as its own job (weekly CI) and only fails on genuinely dead links.
 *
 * Classification:
 *   live        — 2xx / 3xx
 *   bot_blocked — 403/405/406 (gov sites block automated clients; NOT broken)
 *   unreachable — connection reset / timeout / TLS / 5xx: commonly transient network
 *                 weather or datacenter-IP bot-protection (e.g. CA dir.ca.gov resets
 *                 connections). Reported for review but does NOT fail — crying wolf on
 *                 flaky egress is exactly what must NOT gate a refresh.
 *   broken      — 404 / 410 (page gone) or DNS non-resolution (domain gone) → exit(1)
 *
 * Run: npm run prep:linkcheck            (probe all)
 *      npm run prep:linkcheck -- --json  (machine-readable report to stdout)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "data", "v2");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 10;
const jsonOut = process.argv.includes("--json");

// Every array file that carries source URLs (top-level sourceUrl and/or provenance.sourceUrl).
const FILES = [
  "regulatory.json", "inspections.json", "import_export.json", "regulations.json",
  "labor.json", "building.json", "environment.json", "consumer.json",
  "applicability_rules.json",
];

type Cite = { file: string; id: string; url: string };
const cites: Cite[] = [];
for (const f of FILES) {
  let rows: unknown;
  try {
    rows = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  } catch {
    continue;
  }
  if (!Array.isArray(rows)) continue;
  for (const r of rows as Record<string, any>[]) {
    const id = String(r?.id ?? r?.no ?? "?");
    const urls = new Set<string>();
    if (typeof r?.sourceUrl === "string" && r.sourceUrl) urls.add(r.sourceUrl);
    const pu = r?.provenance?.sourceUrl;
    if (typeof pu === "string" && pu) urls.add(pu);
    for (const url of urls) cites.push({ file: f, id, url });
  }
}

// Probe each UNIQUE url once, map results back to the citing rows.
const unique = [...new Set(cites.map((c) => c.url))];

type Status = "live" | "bot_blocked" | "unreachable" | "broken";
type Code = number | string; // number = HTTP status; string = `ERR:<cause>`
const DNS_DEAD = new Set(["ENOTFOUND", "EAI_AGAIN", "ERR_NAME_NOT_RESOLVED"]);

async function probeOnce(url: string, method: "HEAD" | "GET"): Promise<Code> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: ac.signal,
      headers: { "User-Agent": UA, Accept: "text/html,application/pdf,*/*" },
    });
    return res.status;
  } catch (e: any) {
    const cause = e?.cause?.code || (e?.name === "AbortError" ? "ETIMEDOUT" : e?.message) || "UNKNOWN";
    return `ERR:${cause}`;
  } finally {
    clearTimeout(t);
  }
}

const isErr = (c: Code): c is string => typeof c === "string";
function classify(c: Code): Status {
  if (isErr(c)) return DNS_DEAD.has(c.slice(4)) ? "broken" : "unreachable";
  if (c === 403 || c === 405 || c === 406) return "bot_blocked";
  if (c >= 200 && c < 400) return "live";
  if (c === 404 || c === 410) return "broken";
  return "unreachable"; // other 4xx/5xx — could be transient or WAF; don't hard-fail
}

async function probe(url: string): Promise<{ status: Status; code: Code }> {
  // HEAD first; fall back to GET on bot-block-ish or network error.
  let code = await probeOnce(url, "HEAD");
  if (isErr(code) || code === 403 || code === 405 || code === 406) {
    const g = await probeOnce(url, "GET");
    if (!isErr(g)) code = g;
    else if (isErr(code)) code = g; // both errored — keep the GET cause
  }
  let status = classify(code);
  // One retry for transient (unreachable) results to shed network-weather false positives.
  if (status === "unreachable") {
    const g = await probeOnce(url, "GET");
    const s2 = classify(g);
    if (s2 !== "unreachable") { status = s2; code = g; }
  }
  return { status, code };
}

async function run() {
  const result = new Map<string, { status: Status; code: Code }>();
  for (let i = 0; i < unique.length; i += CONCURRENCY) {
    const batch = unique.slice(i, i + CONCURRENCY);
    const settled = await Promise.all(batch.map((u) => probe(u).then((r) => [u, r] as const)));
    for (const [u, r] of settled) result.set(u, r);
  }

  const broken: Cite[] = [];
  const unreachable: Cite[] = [];
  const counts = { live: 0, bot_blocked: 0, unreachable: 0, broken: 0 };
  const seen = new Set<string>();
  for (const c of cites) {
    const r = result.get(c.url)!;
    if (!seen.has(c.url)) {
      counts[r.status]++;
      seen.add(c.url);
    }
    if (r.status === "broken") broken.push(c);
    else if (r.status === "unreachable") unreachable.push(c);
  }

  if (jsonOut) {
    console.log(JSON.stringify({
      uniqueUrls: unique.length, counts,
      broken: broken.map((b) => ({ ...b, code: result.get(b.url)!.code })),
      unreachable: unreachable.map((b) => ({ ...b, code: result.get(b.url)!.code })),
    }, null, 2));
  } else {
    console.log(`Link check — ${unique.length} unique URLs across ${cites.length} citations`);
    console.log(`  ✓ live: ${counts.live}   · bot_blocked (ok): ${counts.bot_blocked}   ~ unreachable: ${counts.unreachable}   ✗ broken: ${counts.broken}`);
    if (unreachable.length) {
      console.log(`\n  Unreachable (transient/bot-protected — review, not failing):`);
      for (const b of unreachable) console.log(`   ~ [${result.get(b.url)!.code}] ${b.file} #${b.id}  ${b.url}`);
    }
    if (broken.length) {
      console.error(`\n  Broken source URLs (${broken.length} citations):`);
      for (const b of broken) console.error(`   ✗ [${result.get(b.url)!.code}] ${b.file} #${b.id}  ${b.url}`);
    }
  }

  if (counts.broken) {
    console.error(`\nLINK CHECK FAILED: ${counts.broken} broken (404/410/DNS) source URL(s).`);
    process.exit(1);
  }
  console.log(`\nNo broken links. (${counts.unreachable} unreachable flagged for review.)`);
}

run();
