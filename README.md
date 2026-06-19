# Luckin NA · QA Food-Safety Dashboard

Internal Quality-Assurance dashboard for Luckin Coffee NA — turns U.S. food-safety
**regulation/recalls** and local **health-inspection** results (our stores + priority
competitors) into concrete QA action. Bilingual (中/EN). **One-time prepared static data**,
deployed on **Vercel** — no schedulers, no scrapers, no always-on process. Re-running the
prep + redeploying is the "refresh."

> ⚠️ Data is auto-collected from official public sources and **classified heuristically**;
> it is for QA reference and must be **reviewed before exports/alerts are treated as final**.
> Free-text Chinese summaries are blank where source text is English (UI falls back to
> English) until a translation enrichment pass is added — values are **never fabricated**.

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind · Recharts 3 · TanStack Table · Zod.
Data: versioned JSON under `/data/v2`, read at build time. Excel export: a static file
**built from scratch by `openpyxl`** (a 7-sheet styled workbook — see below). **Zero serverless
functions** — the entire app is static/SSG on the CDN.

## Monitoring modules (V2)
Six modules: **Food Safety** · **Import/Export & Border Control** · **State & Local Regulation** ·
**Café Inspection** · **Negative Media & Sentiment** · **Reporting/Alerting**, with 5-level risk
(adds 关注 Watch), establishment IDs, 4 alert types, a Monthly Summary, and a risk heatmap /
compliance-countdown views.

## Surfaces
**Intelligence:** `/` Monthly Summary + Overview · `/alerts` 4-type alerts.
**Modules:** `/intelligence` Regulatory & recall feed · `/import` Import/Export · `/regulation`
State & Local Regulation (compliance-countdown Gantt) · `/inspections` (+ `/inspections/[id]`) ·
`/sentiment` Negative media (links only).
**Analytics:** `/benchmark` · `/trends` · `/actions` QA Action Center · `/sources` Data sources & coverage.
中/EN toggle + Excel/Print export in the header.

## Develop
```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # production build (also type-checks + re-validates /data)
npm run typecheck      # app + prep
```

## Refresh the data (one-time prep) — see docs/RUNBOOK.md
```bash
# 1. collect real data from official sources (federal + open-data jurisdictions)
HTTP_USER_AGENT="LuckinNA-QA-FoodSafety-Monitor/1.0 (contact: you@luckin)" npm run prep:collect
# 2. (optional) add manual records for no-API jurisdictions in intake/inspections.json
# 3. QA REVIEW the prepared /data, then validate + export
npm run prep:validate
npm run prep:export    # → public/exports/monthly_report.xlsx (Python + openpyxl, 7 sheets)
# 4. commit /data + public/exports and redeploy
```
`npm run prep:build` chains collect → validate → export.
**Prereqs for prep:** Node ≥ 20; Python 3 + `openpyxl` for the export step (`pip install openpyxl`).

**Excel export (7 sheets, built from scratch):** Monthly Summary · Food-Safety main · Import/Export ·
State/Local Regulation · Café Inspections (incl. 门店编号 Establishment ID) · Sources Log · Field Guide —
with 5-level Risk-Level cell fills, navy bilingual frozen headers, and autofilter. The exporter
(`prep/export_xlsx.py`) reopens the file and asserts the 7 sheets / risk fills / est-id col / pull-log.

**Optional key-gated collectors** (FDA Import Refusals, LegiScan/NY-Senate state bills) are documented
in [docs/API_KEYS.md](docs/API_KEYS.md) — not yet wired; the modules run on Federal-Register + curated
seeds + RSS today.

## Deploy (Vercel)
1. Push the repo to GitHub/GitLab/Bitbucket (`/data` and `public/exports` are committed).
2. Import into Vercel — framework preset **Next.js**, no configuration needed.
3. **No environment variables** are required for the deployed app (static read + static export).
   Prep-only secrets (optional Socrata token, store list) live in local `.env` (gitignored).
4. Build command `next build`, output served from the CDN; the export is a static asset.

**Upgrade path to live (out of scope):** keep all reads behind `src/lib/data.ts`; later add a
Vercel Cron job that writes fresh data into a hosted Postgres and swap that one loader from
JSON-import to DB-query. See docs/RUNBOOK.md.

## Data sources (this build)
Real one-time pull: **openFDA** recalls, **Federal Register** (incl. agriculture/import agency slugs),
**CDC NORS**, **NYC** (DOHMH), **Boston** (Analyze Boston), **Food Safety News RSS** (sentiment).
Curated from the May 2026 reference report: **Import/Export** named actions (APHIS HPAI, FDA Prior Notice,
FSIS Mexico list) and **State/Local Regulation** named laws (CA SB68, NYC added-sugar/sodium, NY S5381).
Manual/pending (no usable API — see `/sources` + docs/JURISDICTION_PLAYBOOK.md): FDA Warning Letters
(bulk XML), USDA/FSIS (CDN blocks bots), LA County (large ArcGIS CSV), San Francisco (frozen feed),
Washington DC, Newark & Bergen NJ (OPRA), Florida FDACS (robots-deny). Key-gated import/state-bill
collectors are documented in [docs/API_KEYS.md](docs/API_KEYS.md) (not yet wired).
