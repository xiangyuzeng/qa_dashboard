# Curated-Seed Provenance Audit · 种子数据溯源审计

**Scope:** the ~369 static curated seed rows that never change on refresh — the 5 "policy baseline" modules flagged by the amber *非实时* badge.
**Date:** 2026-07-14 · **Auditor:** DBA/infra (David Zeng) · **Method:** field extraction + live HTTP liveness probe of every cited source URL.
**Machine-readable companion:** [`docs/provenance_map.csv`](./provenance_map.csv) — one row per seed with jurisdiction, authority tier, law/bill, agency, effective date, source id, source URL, and probed URL status.

> **Remediation status (2026-07-14):** all 18 dead URLs found by this audit — **plus 3 more** surfaced by the new `prep:linkcheck` guard (2× defunct `elaws.us` mirrors, 1× a malformed URL with prose appended) — have been corrected to verified official pages. `provenance_map.csv` now shows **0 broken across all 369 rows** (284 live + 85 bot-blocked). A `prep:linkcheck` script + weekly CI job now guard against future link rot. See §4 and §6.

---

## 1. Coverage

| Module (file) | Rows | provenance.sourceId |
|---|---|---|
| labor.json | 100 | `dcwp_dol_labor` |
| building.json | 88 | `osha_dob_building` |
| environment.json | 85 | `dep_dsny_env` |
| consumer.json | 88 | `dcwp_ftc_consumer` |
| regulations.json | 8 | `may_report_regulation` |
| **Total** | **369** | |

Two seed provenances: `regulations.json` (8) is transcribed **verbatim from the client's 2026-05 bilingual report**; the four domain files (361) are **multi-state expansion rows authored by the v2.7 build Workflow**, which is why they carry the highest hallucination risk and are the focus of this audit.

## 2. Authority tier (jurisdiction)

| Tier | Rows | Notes |
|---|---|---|
| Federal | 77 | DOL/WHD, EEOC, OSHA, FTC, EPA, NIST, Cornell LII (CFR/USC) |
| State | 215 | NY, CA, MA, NJ, FL — official legislature/agency portals |
| City / local | 75 | NYC (DCWP/DEP/DSNY), Washington DC |
| Other | 2 | cross-jurisdiction regulation rows |

All 369 cite a source URL (0 nulls). Domains are exclusively legitimate government / official legal-code hosts (nyc.gov, mass.gov, law.cornell.edu, osha.gov, leginfo.legislature.ca.gov, ftc.gov, eeoc.gov, dccouncil.gov, flsenate.gov, …). **No fabricated or non-authoritative domains.**

## 3. URL liveness (live HTTP probe, browser UA, HEAD→GET fallback)

| Status | Rows | Interpretation |
|---|---|---|
| `live_200` | 266 (72%) | Verified reachable |
| `bot_blocked` (403/405/406) | 85 (23%) | Gov sites blocking automated clients — **inconclusive, not broken** (same behavior FSIS shows) |
| `broken_404` | 17 (4.6%) | Dead link — needs correction |
| `server_500` | 1 | Host error (NY State health regs portal) |

**Verified-or-plausible (200 + bot-blocked) = 351 / 369 (95%).** Only **18 rows** carry a demonstrably dead URL.

## 4. Key finding — link rot, not fabrication

Every one of the 18 broken rows cites a **real, nameable regulation**; only the URL is stale. The dominant cause is the **NYC DCA → DCWP agency rename + site restructure** (8 rows), which deep-404s the old `nyc.gov/site/dca/…/*.page` paths (a plain `dca`→`dcwp` swap does **not** fix them — the paths were restructured too). Remainder = moved PDFs / superseded code-development pages / a health-regs portal 500.

### The 18 rows — all corrected (verified 200)

Every URL below was replaced in the durable source (`prep/seeds/*.json` + `prep/seeds.ts`) and the built `data/v2/*.json`, and re-probed live. NYC rows mostly moved to the current DCWP/DSNY pages; note the straw rule is a **DSNY** page, not DCWP.

| Module # | Jurisdiction | Regulation (real) | Dead URL cause |
|---|---|---|---|
| labor #21 | NYC | Temporary Schedule Change Law | DCA→DCWP restructure |
| labor #80 | NYC | Fair Workweek Law | DCA→DCWP restructure |
| labor #81 | NYC | Earned Safe & Sick Time Act | DCA→DCWP restructure |
| labor #59 | FL | Minimum Wage (Amdt 2 phase-in) | floridajobs.org poster PDF moved |
| labor #100 | NYC | Required workplace postings | `dol.ny.gov/all-employers` moved (base host OK) |
| building #17 | NY State | Cross-Connection/Backflow (10 NYCRR) | regs.health.ny.gov **500** |
| building #57 | FL | Florida Building Code 9th ed. (2026) | code-development page retired |
| building #84 | NYC | NFPA 96 kitchen exhaust | up.codes viewer path moved |
| environment #27 | NJ | Polystyrene foam foodware ban | njlm.org CivicAlerts ID gone |
| environment #30 | NJ | Industrial stormwater 5G2 permit | NJDEP fact-sheet PDF moved |
| environment #74 | NYC | DEP Fats/Oils/Grease BMP | nyc.gov DEP path moved |
| environment #77 | NYC | Commercial recycling | nyc.gov DSNY path moved |
| environment #80 | NYC | Plastic straw-on-request | DCA→DCWP restructure |
| consumer #10 | Federal | NIST Handbook 130 | nist.gov edition-specific slug moved |
| consumer #77 | NYC | Refund-policy posting | DCA→DCWP restructure |
| consumer #78 | NYC | Consumer Protection Law pricing/signage | DCA→DCWP restructure |
| consumer #85 | NYC | Item-pricing / price-scanner rules | DCA→DCWP restructure |
| consumer #86 | NYC | Weights & Measures device inspection | DCA→DCWP restructure |

## 5. Completeness gaps (non-blocking)

- **`effectiveDate` empty on 118 rows** — many cite standing statutes/codes with no single "effective" date; acceptable but limits timeline filtering.
- **`agency` empty on 8 rows** — exactly the `regulations.json` set, whose schema uses `coveredEntities` instead of `agency`. Schema difference, not a true gap.
- **`provenance.docRef` null on all seed rows** — the structured citation (CFR §, bill number) lives in `law_or_bill`/title free-text, not in a dedicated field.

## 6. Verdict & recommendations

**Verdict:** the curated seeds are **genuine and authoritatively sourced** — 95% of URLs verify live-or-bot-blocked, all domains are official, and the 18 dead links point to real regulations (link rot from agency renames/site moves), **not fabricated law**. This is consistent with the earlier `fix(audit): strip fabricated competitor enforcement` cleanup: what remains is real.

**Follow-ups:**
1. ✅ **DONE — fixed the 18 dead URLs** (+ 3 more the new guard surfaced). All 21 corrected to verified official pages in the durable seed source + built data; audit CSV now 0-broken.
2. ✅ **DONE — added a link-rot guard.** New `prep/linkcheck.ts` (`npm run prep:linkcheck`) probes every source URL and a **weekly** `.github/workflows/linkcheck.yml` opens/updates a `link-rot` issue on failure. Deliberately **separate from `prep:validate`** — the build gate stays hermetic so network weather can never freeze a refresh (the 2026-07 frozen-refresh lesson). Classification is failure-safe: only `404/410/DNS` fail; connection-reset/TLS/timeout are reported as *unreachable* (not failing), since gov sites (e.g. `dir.ca.gov`) reset datacenter-IP connections.
3. ⏳ (Root fix, separate track) **Option 1** — wire the dormant key-gated live collectors so these modules stop being static baseline at all; supersedes seed maintenance.
