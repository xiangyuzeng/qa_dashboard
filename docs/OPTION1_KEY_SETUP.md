# Live-Data Setup — code status + required API keys

Two parts: (1) what the **code fix** turned live with **no key**, and (2) the **required API keys** that remain, with how to get each. A missing key/collector always degrades to **0 rows + a truthful provenance stub** — never a fabricated row.

---

## Part 1 — Code fix (done): 3 NYC enforcement collectors now live, no key

Previously these were dormant stubs (`enabled: () => false`, returned `[]`). They are now **implemented** in `prep/collect.ts` against live NYC Open Data — **no key required**. Match is by the **full business name "LUCKIN COFFEE"** as the cited respondent (not a raw address, and not a loose `%LUCKIN%` — "Luckin" is also a human surname), so rows are truthfully attributed to us, with zero landlord/individual misattribution.

| Collector | Module | Source (NYC Open Data) | Current live result |
|---|---|---|---|
| `nyc_dsny_enforcement` | Environment | OATH Hearings `jz4z-kudi` (DSNY/DOS agencies) | **5 real summonses** (e.g. §16-120 receptacle removal, §16-116 sign permit; zips 10003/10038) |
| `nyc_dob_violations` | Building | ECB violations `6bgk-3dad` | 0 (no building violations name Luckin — correct) |
| `nyc_dcwp_consumer` | Consumer | OATH Hearings `jz4z-kudi` (DCA/Consumer agencies) | 0 (correct) |

Effect: once these rows are present, the module's amber *策略基线 · 非实时* badge clears automatically. The **Environment** module goes live-augmented immediately on the next refresh; Building/Consumer stay on curated seeds until a real violation appears (then auto-surface). **No key, no config** — the weekday CI already runs these.

### Still code-only (not solved), documented for honesty
- `osha_establishments` (Building) — federal OSHA ORDS establishment search; interface unstable, left as a truthful stub.
- `dol_enforcedata` (Labor) — see DOL in Part 2 (needs a key **and** bulk-CSV parse wiring).

---

## Part 2 — Required API keys (the only things still gated)

All are **free** government/civic APIs (none are AI keys). Add each as a repo Secret; the CI (`.github/workflows/monthly-refresh.yml`) already wires every variable below.

| `.env` / Secret var | Unlocks | Module | Where to register | Free tier |
|---|---|---|---|---|
| `LEGISCAN_KEY` | LegiScan state bills | Regulation | legiscan.com → free account → API key | 30,000 / mo |
| `NY_SENATE_KEY` | NY Senate OpenLegislation bills | Regulation | legislation.nysenate.gov → request key | generous |
| `OPENSTATES_KEY` | OpenStates multi-state bills | Regulation | openstates.org/accounts → API key | ~500 / day |
| `FDA_OII_USER` + `FDA_OII_KEY` | FDA import-refusal dashboard | Import/Export | FDA OII Unified Logon portal → request credentials | per FDA terms |
| `DOL_ENFORCE_KEY` ⚠️ | DOL WHD wage/hour enforcement | Labor | dol.gov / enforcedata.dol.gov | free |
| `SOCRATA_APP_TOKEN` *(optional)* | raises NYC/Socrata rate ceiling (already live without it) | all NYC feeds | any Socrata portal (e.g. data.cityofnewyork.us) → app token | anon ~1k/hr |

⚠️ **`DOL_ENFORCE_KEY` needs code too** — the key gate exists, but `collectDOLEnforcement()` still needs the WHD bulk-download parse + brand-match wired before it yields rows. Key alone won't activate it.

### Translation key (optional, non-gov) — `DEEPL_KEY`

| `.env` / Secret var | Unlocks | Module | Where to register | Free tier |
|---|---|---|---|---|
| `DEEPL_KEY` *(optional)* | auto-translate English-only live rows → 中文 (`prep:translate`) | Import + Intelligence/regulatory + Sentiment | deepl.com → **API Free** plan → Authorization key (ends `:fx`) | 500,000 chars / mo |

This is the one **non-government** key: a machine-translation service, not an AI/LLM key. Purely an
enhancement — **without it the site is fully correct**, it just shows the English original for the
live English-only rows (with an "英文原文" badge). With it, `prep:translate` fills the missing
`chineseTitle`/`chineseSummary` on the three English-only live feeds — **import_export** (Federal
Register), **regulatory** (FDA recalls / Federal Register / CDC NORS → shown on /intelligence), and
**sentiment** (Food Safety News RSS) — via DeepL, caches by source-text hash in
`data/v2/mt_cache.json` (so unchanged text is never re-billed), and marks each translated row
`provenance.mtAt` → the UI shows a "机器翻译 / machine-translated" badge (English original stays
authoritative). Curated bilingual seeds are never overwritten. Failure-safe: no key or an API error
just leaves those rows English — it never fails the build. First full run translates ~290 unique
strings (well under the monthly free tier); later runs only new rows.

### How to add a key (production)
GitHub → repo **Settings → Secrets and variables → Actions → New repository secret** → name it exactly as the var above → paste the value. The next weekday refresh (06:00 UTC Mon–Fri) or a manual **Actions → Weekday data refresh → Run workflow** picks it up; Vercel redeploys. No code change.

### Local test
```bash
echo 'LEGISCAN_KEY=your_key_here' >> .env   # .env is git-ignored
npm run prep:collect                         # tsx auto-loads .env
```

### Verify it activated
`/sources` page → the collector's `status` flips `manual` → `fetched`/`no_update` with a real `recordCount`; the affected module's baseline badge clears.

---

## Bottom line

- **Nothing above is required for the dashboard to have real live data** — recalls, inspections, import (Federal Register), sentiment, **and now NYC DSNY/DOB/DCWP enforcement** all run **key-free**.
- The remaining keys are **enhancement-only**: state-bill feeds (Regulation) and FDA import refusals (Import). Highest-leverage single step: add **`LEGISCAN_KEY`** → Regulation module goes live.
