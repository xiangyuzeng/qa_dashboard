# Runbook — monthly refresh & deploy

The dashboard serves **one-time prepared static data**. "Refresh" = re-run the prep locally,
QA-review, then commit + redeploy. Nothing runs on Vercel except serving static files.

## Prerequisites
- Node ≥ 20, npm
- Python 3 + `openpyxl` (`pip install openpyxl`) — for the Excel export step
- A descriptive `HTTP_USER_AGENT` (and `FSIS_USER_AGENT`) — copy `.env.example` → `.env`
- Optional: `SOCRATA_APP_TOKEN` (raises throttle ceiling; not required)
- Optional: `config/store_list.json` (gitignored) to precisely tag owned Luckin stores
- Optional: key-gated collector keys (FDA Import Refusals, LegiScan/NY-Senate) — **not yet wired**; see "Optional collectors" below + [API_KEYS.md](API_KEYS.md)

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

2. **Manual intake** (no-API jurisdictions: DC, Newark, Bergen, FL, current SF) — optional:
   add records to `intake/inspections.json` (see `intake/README.md`). NJ/unavailable data uses
   `dataAvailability:"not_public_online"`; never record missing data as "no inspection".

3. **HUMAN-REVIEW GATE.** Inspect `data/v2/*.json`. Auto-collected records are marked
   `reviewNote:"auto-collected …"`; manual records start `reviewed:false`. Verify classifications,
   risk/alert flags, and source refs. Set `reviewed:true` (and `reviewStatus:"approved"`) for
   records cleared for export/alerting; set `reviewStatus:"rejected"` to drop a bad record. The
   app + export serve **approved records only**.

4. **Validate** against the Zod contract (fails loudly on malformed/invalid-enum data):
   ```bash
   npm run prep:validate
   ```

5. **Export** the bilingual Excel — builds the **7-sheet styled workbook from scratch** with openpyxl
   (Monthly Summary · Food-Safety main · Import/Export · State/Local Reg · Café Inspections incl.
   门店编号 · Sources Log · Field Guide; 5-level risk fills, frozen bilingual headers, autofilter).
   The script verifies the sheets / fills / est-id col / pull-log on save:
   ```bash
   npm run prep:export      # → public/exports/monthly_report.xlsx
   ```

6. **Commit & deploy:**
   ```bash
   git add data/ public/exports/ intake/ && git commit -m "data refresh: <period>"
   git push        # Vercel auto-builds & deploys
   ```
   Set `data/v2/meta.json` `reportingPeriod` for the period label (the collector sets it to the
   current month automatically).

`npm run prep:build` runs steps 1 + 4 + 5 in sequence.

## Optional collectors (key-gated — not yet wired)
Modules 2/3 currently run on Federal-Register-import (auto) + curated May-report seeds; Module 5 on RSS.
To move toward full auto later, obtain the relevant free keys (FDA OII Import Refusals, LegiScan, NY
Senate OpenLegislation, optional OpenStates) and build the matching collector — the POST infra
(`postJson()` in `prep/lib/http.ts`) is already in place. Full step-by-step (where to register, fields,
free-tier limits, `.env` vars) is in [docs/API_KEYS.md](API_KEYS.md). Until a collector is built, an
absent key emits a truthful `manual`/`no_update` provenance stub — never a fabricated row.

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
