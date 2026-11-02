# Runbook — monthly refresh & deploy

The dashboard serves **one-time prepared static data**. "Refresh" = re-run the prep locally,
QA-review, then commit + redeploy. Nothing runs on Vercel except serving static files.

## Prerequisites
- Node ≥ 20, npm
- Python 3 + `openpyxl` + `python-docx` (`pip install openpyxl python-docx`) — for the Excel & Word export steps
- A descriptive `HTTP_USER_AGENT` (and `FSIS_USER_AGENT`) — copy `.env.example` → `.env`
- Optional: `SOCRATA_APP_TOKEN` (raises throttle ceiling; not required)
- Optional: `config/store_list.json` (gitignored) to precisely tag owned Luckin stores
- Optional: key-gated collector keys (FDA Import Refusals, LegiScan, NY-Senate) — collectors are **built but dormant**; add a key to activate. See "Optional collectors" below + [API_KEYS.md](API_KEYS.md)

## Steps
1. **Collect** real data from official sources:
   ```bash
   npm run prep:collect
   ```
   Pulls openFDA, Federal Register (incl. agriculture/import agency slugs → Module 2), CDC NORS,
   FSIS (UA), NYC, Boston, and Food Safety News RSS (→ Module 5 sentiment). Also loads the curated
   May-2026 seeds for Import/Export and State/Local Regulation (Module 2/3 named actions & laws).
   Filters local inspections to café/priority-brand scope and captures `establishmentId`. Each
   source is fault-isolated — a failure records 0 rows + a provenance note (never a fabricated row).
   Review the console summary. (Key-gated collectors are **not** run here — see "Optional collectors".)

   **Then re-apply the in-pipeline enrichment** (`prep:collect` rewrites `inspections.json` from
   its collectors, so the multi-agency OATH enforcement + owned-store CAMIS join must be re-run):
   ```bash
   npm run prep:enrich
   ```
   Idempotent + network-fault-tolerant (a failed pull keeps existing data; never fabricates):
   strict word-boundary brand-match against OATH Hearings (`jz4z-kudi`) for competitor
   DSNY/DEP/FDNY/DOB/DCWP/DOHMH enforcement, and address-matches the owned roster to NYC DOH
   (`43nn-pn8j`) for `dohEstablishmentId`.

2. **Manual intake** (no-current-API jurisdictions: DC, Newark, Bergen, FL, SF) — `intake/inspections.json`
   already ships with **real SF café/brand rows** (from the frozen 2019 SF LIVES open feed; true dates so
   the staleness is visible) plus documented `not_public_online` gap markers for DC/Newark/Bergen/FL.
   Add more records as obtained (see `intake/README.md`); NJ/unavailable data uses
   `dataAvailability:"not_public_online"` — never record missing data as "no inspection".

3. **HUMAN-REVIEW GATE.** Inspect `data/v2/*.json`. Auto-collected records are marked
   `reviewNote:"auto-collected …"`; manual records start `reviewed:false`. Verify classifications,
   risk/alert flags, and source refs. Set `reviewed:true` (and `reviewStatus:"approved"`) for
   records cleared for export/alerting; set `reviewStatus:"rejected"` to drop a bad record. The
   app + export serve **approved records only**.

4. **Validate** against the Zod contract (fails loudly on malformed/invalid-enum data):
   ```bash
   npm run prep:validate
   ```

5. **Export** the bilingual report — builds the **7-sheet styled Excel from scratch** with openpyxl
   (Monthly Summary · Food-Safety main · Import/Export · State/Local Reg · Café Inspections incl.
   门店编号 · Sources Log · Field Guide; 5-level risk fills, frozen bilingual headers, autofilter)
   **and a matching bilingual Word (.docx)** report (python-docx; same sections, risk-shaded tables).
   Both verify their structure on save:
   ```bash
   npm run prep:export      # → public/exports/monthly_report.{xlsx,docx}
   ```

6. **Commit & deploy:**
   ```bash
   git add data/ public/exports/ intake/ && git commit -m "data refresh: <period>"
   git push        # Vercel auto-builds & deploys
   ```
   Set `data/v2/meta.json` `reportingPeriod` for the period label (the collector sets it to the
   current month automatically).

`npm run prep:build` runs collect → enrich → domains → translate → merge → meta → validate → export in sequence.

### Record ids and how a refresh updates the store
- **Ids are ours.** `prep:merge` is the only step that issues them, from `data/v2/id_registry.json`
  ((module, externalKey) → id). A known key keeps its id forever; a new key gets a new random id.
  Collectors never compute an id — they record the source's own identifier in
  `provenance.externalKey` (e.g. `oath:0184526F0`, `nyc-dohmh:50178654|2026-02-17`), used only to match
  the record across refreshes and to exchange data with the source.
- **collect / enrich / domains / translate write today's pull to `.prep/stage/`** (not committed);
  `prep:merge` folds it into `data/v2/`. Run the steps in order from `prep:collect` — enrich and
  translate read the stage that collect wrote.
- **Nothing is auto-deleted.** If a source fails, its stored records stay as they were. If it pulls
  fine but no longer returns a record, the record is kept and shows "来源已 N 天未返回"; after 3
  consecutive successful pulls without it, "来源已撤下". Records merely pushed out of a newest-N sample
  are kept as history (`sourceState: "history"`, no badge). Exception: an owned store's
  "awaiting first inspection" record is removed once DOHMH stops listing it (it got inspected).
- **Manual review decisions** (`npm run prep:gate -- --apply`) are stored by id in
  `data/v2/review_overrides.json` and re-applied after every refresh.
- `prep:validate` fails if a record has no externalKey, a key repeats within a module, or the store
  and the registry disagree.

## Automated monthly refresh (GitHub Action)
> 中文分步操作指南（含 Secrets 配置）：[docs/AUTO_REFRESH.zh.md](AUTO_REFRESH.zh.md)

`.github/workflows/monthly-refresh.yml` runs the whole pipeline unattended on the **1st of each
month** (and on demand via *Actions → Monthly data refresh → Run workflow*):

`prep:collect → prep:enrich → prep:domains → prep:translate → prep:merge → prep:meta → prep:validate → prep:export`, then
`typecheck` + `build` to prove the refreshed data renders.

- **Review gate preserved:** by default it opens a **Pull Request** (`data-refresh` branch) with the
  diff. A human reviews it (RUNBOOK step 3 — watch for feed flooding, e.g. FSIS ballooning the recall
  count) and **merging the PR triggers Vercel's deploy**. For a trusted unattended deploy, run the
  workflow manually with **`push_to_main: true`** to commit straight to `main`.
- **API keys** come from repo **Secrets** (`SOCRATA_APP_TOKEN`, `FDA_OII_USER/KEY`, `LEGISCAN_KEY`,
  `NY_SENATE_KEY`, `OPENSTATES_KEY`, `DOL_ENFORCE_KEY`). Any unset key leaves that collector dormant
  (0 rows + a truthful provenance stub) — never fabricated. Set them in *Settings → Secrets and
  variables → Actions*.
- **Validation is the gate:** `prep:validate` (Zod contract + id-uniqueness + source-ref integrity)
  fails the run on malformed data, so a bad pull never reaches a PR or `main`.

## Optional collectors (key-gated — built, dormant without keys)
Modules 2/3 run on Federal-Register-import (auto) + curated May-report seeds; Module 5 on RSS. Three
key-gated collectors are **built** in `prep/collect.ts` — `collectImportRefusals()` (FDA OII Import
Refusals, POST), `collectLegiScanBills()` and `collectNYSenateBills()` (state bills, GET) — and ship
**dormant**: with no key they emit a truthful `manual` provenance stub (0 rows, never fabricated,
visible on `/sources`). Add the relevant free key to `.env` and re-run `npm run prep:collect` to
activate (full step-by-step — where to register, fields, free-tier limits, `.env` vars — in
[docs/API_KEYS.md](API_KEYS.md)).

## Translation enrichment (follow-up)
Source text is English; the schema's Chinese free-text fields (`chineseTitle`, `chineseSummary`,
`chineseViolationSummary`) are left blank (UI falls back to English). To complete the bilingual
report, add a translation pass over the prepared JSON (e.g. an LLM step) that fills those fields
faithfully, then re-validate + re-export. Structured fields (categories, enums, risk, café tags)
are already bilingual.

## Going live later (out of scope)
All reads go through `src/lib/data.ts`. To make it live: provision Neon/Supabase/Vercel Postgres,
move the collectors into a Vercel Cron route (`vercel.json` `crons`) that writes to a staging table,
keep the review gate (promote staging→published after review), and swap `data.ts` from JSON-import
to DB-query. The export and all surfaces are unchanged.
