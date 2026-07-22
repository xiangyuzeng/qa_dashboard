# Luckin NA · QA Food-Safety Dashboard

Internal Quality-Assurance dashboard for Luckin Coffee NA — turns U.S. food-safety
**regulation/recalls** and local **health-inspection** results (our stores + priority
competitors) into concrete QA action. Bilingual (中/EN). **One-time prepared static data**,
deployed on **Vercel** — no schedulers, no scrapers, no always-on process. Re-running the
prep + redeploying is the "refresh."

> ⚠️ Data is auto-collected from official public sources and **classified heuristically**;
> it is for QA reference and must be **reviewed before exports/alerts are treated as final**.
> Some live feeds are English-only (US federal / RSS): their Chinese is either machine-translated
> at build time (DeepL — shown with a **机器翻译** badge; see [Chinese machine-translation](#chinese-machine-translation-deepl-api-free--optional))
> or, when no translation key is set, left as the English original (an **英文原文** badge).
> Values are **never fabricated**.

## Stack
Next.js 15 (App Router) · TypeScript · Tailwind · Recharts 3 · TanStack Table · Zod.
Data: versioned JSON under `/data/v2`, read at build time. Report export: static files
**built from scratch** — a 7-sheet styled Excel (`openpyxl`) + a matching bilingual Word `.docx`
(`python-docx`); see below. **Zero serverless functions** — the entire app is static/SSG on the CDN.

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
npm run prep:export    # → monthly_report.xlsx (openpyxl, 7 sheets) + .docx (python-docx)
# 4. commit /data + public/exports and redeploy
```
`npm run prep:build` chains collect → enrich → translate → meta → validate → export
(`prep:translate` = optional DeepL pass, see below; it no-ops without a key).
**Prereqs for prep:** Node ≥ 20; Python 3 + `openpyxl` + `python-docx` for the export step (`pip install openpyxl python-docx`).

**Excel export (7 sheets, built from scratch):** Monthly Summary · Food-Safety main · Import/Export ·
State/Local Regulation · Café Inspections (incl. 门店编号 Establishment ID) · Sources Log · Field Guide —
with 5-level Risk-Level cell fills, navy bilingual frozen headers, and autofilter. The exporter
(`prep/export_xlsx.py`) reopens the file and asserts the 7 sheets / risk fills / est-id col / pull-log.
A matching **bilingual Word (`.docx`) report** (`prep/export_docx.py`, python-docx) covers the same
sections with risk-shaded tables, for stakeholders who prefer Word/PDF.

**Key-gated collectors** (FDA Import Refusals, LegiScan, NY-Senate state bills) are **built** in
`prep/collect.ts` but ship **dormant** — add a free key to `.env` (see [docs/API_KEYS.md](docs/API_KEYS.md))
and re-run `prep:collect` to activate; without a key each emits a truthful `manual` provenance stub
(never a fabricated row). Modules 2/3 also run on Federal-Register + curated seeds; Module 5 on RSS.

## Chinese machine-translation (DeepL API Free) — optional

Several live feeds are **English-only** US sources with no Chinese original: the Federal Register
import slugs (`/import`), the FDA-recall / Federal-Register / CDC-NORS regulatory feed
(`/intelligence`), and the Food Safety News RSS sentiment feed (`/sentiment`). By default their rows
show the **English original** in 中文 mode, tagged with an amber **英文原文** badge.

Add a free **DeepL** key and the `prep:translate` step auto-fills the missing Chinese
(`chineseTitle` / `chineseSummary`) at build time, tagging each translated row with an indigo
**机器翻译 / machine-translated** badge (the English original stays authoritative). Translations are
cached by source-text hash in `data/v2/mt_cache.json`, so unchanged text is never re-translated or
re-billed, and curated bilingual seed rows are never overwritten. **Failure-safe:** with no key the
step no-ops (rows stay English) and a DeepL API error never fails the build.

### Get a DeepL API Free key
1. Go to **https://www.deepl.com/pro-api** → pick the **DeepL API Free** plan → **Sign up for free**
   (not the *Pro* plan and not the web-app subscription).
2. Create the account (email + password) and **enter a credit/debit card**. DeepL requires a card to
   verify even the Free plan; you are **not charged** while you stay on Free and under **500,000
   characters/month** (this dashboard uses far less — a first full run is ~290 unique strings).
3. Verify your email, then open **Account → "Authentication Key for DeepL API"** and copy the key.
   A Free key **always ends in `:fx`** — that suffix routes to `api-free.deepl.com`, the endpoint this
   repo uses. *(US-available; a few regions can't register the Free plan.)*

### Wire it in
- **Production (auto-translate on every refresh):** GitHub repo → **Settings → Secrets and variables
  → Actions → New repository secret** → name it exactly `DEEPL_KEY`, paste the `…:fx` key. The next
  weekday refresh — or a manual **Actions → Weekday data refresh → Run workflow** — translates the
  live rows and redeploys. No code change.
- **Verify the key first:** `./scripts/check-deepl-key.sh YOUR_KEY:fx` — checks auth via `/v2/usage`
  (0 characters consumed), shows remaining quota, does a test EN→ZH translation, and diagnoses
  403/456 errors. Never prints the key.
- **Local test:** `export DEEPL_KEY=…:fx && npm run prep:translate` (or `echo 'DEEPL_KEY=…:fx' >> .env`;
  `.env` is gitignored). Offline dry-run with placeholder text: `DEEPL_MOCK=1 npm run prep:translate`.

See [docs/OPTION1_KEY_SETUP.md](docs/OPTION1_KEY_SETUP.md) for this and every other (free, government) key.

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
**CDC NORS**, **NYC** (DOHMH), **Boston** (Analyze Boston), **Food Safety News RSS** (sentiment),
**eCFR Title 21** (FDA food-regulation changes, no key), **FDA food guidance** (via Federal Register, no key),
**NYSDOH proposed rulemaking** + **NYC Rules** (proposed + recently-adopted, café-relevant; HTML-scraped, no key).
Curated from the May 2026 reference report: **Import/Export** named actions (APHIS HPAI, FDA Prior Notice,
FSIS Mexico list) and **State/Local Regulation** named laws (CA SB68, NYC added-sugar/sodium, NY S5381).
Manual/pending (no usable API — see `/sources` + docs/JURISDICTION_PLAYBOOK.md): FDA Warning Letters
(bulk XML), USDA/FSIS (CDN blocks bots), LA County (large ArcGIS CSV), San Francisco (frozen feed),
Washington DC, Newark & Bergen NJ (OPRA), Florida FDACS (robots-deny) — `intake/inspections.json` ships
real SF café/brand rows (frozen 2019 LIVES) + documented `not_public_online` gap markers for the rest.
Key-gated import/state-bill collectors are **built** (dormant without keys) — see [docs/API_KEYS.md](docs/API_KEYS.md).
