# V2 build — handoff (resume here)

> **▶ V2.5 (current) — Applicability Engine + 4 compliance domains.** Built on top of V2. Adds modules
> **labor / building / environment / consumer** (Sheet5–8) + the hero **Applicability/Threshold Engine**
> (`src/lib/applicability.ts`, pure `evaluate()`) consuming the real store footprint
> (`data/v2/owned_stores.json` + `company_profile.json`, 30 NYC stores, asOf 2026-06-20). Surfaces:
> `/applicability` (matrix + what-if + Fair-Workweek basis toggle + UNREVIEWED banner) + Overview 合规姿态
> posture strip + 4 module pages + `applicability` alert type. Excel is now **12 sheets** (+用工合规/建筑与
> 职业安全/环境卫生/消费者与员工保护/适用性矩阵); docx mirrors it.
>
> **Refresh flow (V2.5):** `npm run prep:domains` (= `tsx prep/build_domains.ts`) — writes ONLY the 4 domain
> files + `applicability_verdicts.json` + patches `meta`, **preserving the curated 6-module snapshot** (do NOT
> run full `prep:collect`, which re-pulls live and can flood). Then `prep:validate` + `prep:export`. Curated
> bilingual seeds live in `prep/seeds.ts`; live DCWP/DOB/DSNY/DOL/OSHA adapters are dormant behind the
> `prep/lib/feed.ts` FeedAdapter seam (truthful `manual`/re-verify stubs, no fabrication).
> **Deferred (spec §8):** `/inspections` multi-agency, CAMIS enrichment, `/benchmark` extension, `/regulation` facet.


Status as of this handoff: the **V2 data layer is done & committed**; the **V2 UI + export + docs remain**. This doc is the single source of truth for resuming. Read it together with the approved plan at
`~/.claude/plans/ultracode-claude-dangerously-skip-permis-encapsulated-dragon.md` (the `▶ V2 REVISION` section).

## What V2 is
The client expanded the dashboard from "food safety + café inspections" to **6 monitoring modules** (per `docs/` requirement doc + the bilingual `2026-05` reference report in `~/Downloads`): Food Safety · **Import/Export & Border Control (new)** · **State & Local Regulation (new)** · Café Inspection · **Negative Media & Sentiment (new)** · Reporting. Plus: **5-level risk** (adds 关注 Watch), **Establishment ID**, **4 alert types**, a **Monthly Summary**, a **7-sheet styled Excel**, and **richer aggregation** (the flat Excel was "too plain"). Confirmed decisions: build all of it; hybrid sourcing (auto where free + curated seeds from the May report) with key-gated collectors to add later + a key guide; full sentiment incl. competitors; seed from the May report.

## DONE & committed (verified: typecheck both tsconfigs, `npm run build` EXIT 0, `npm run prep:validate` clean)
- **V-P0** (`32b833f`) — `src/lib/schema.ts` additive contract: `RiskLevelEnum` +`关注`; `ModuleEnum`, `AlertTypeEnum`, `PullStatusEnum`, `ImportActionEnum`, `RegStatusEnum`, `RegTopicEnum`, `RegJurisdictionEnum`, `SentimentCategoryEnum`, `CredibilityEnum`, `RiskTierEnum`; `ImportExportRecord`(+`SHEET3_COLUMNS`), `RegulationRecord`(+`SHEET4_COLUMNS`), `SentimentRecord`; `InspectionRecord` +`module`+`establishmentId` (Sheet5 now 23 cols, `SHEET2_COLUMNS` updated); `Provenance`+`aiSummaryAt`; `SourceProvenance`+`module`+`status`; `MetaSchema`+`summary`(`SummaryMetaSchema`)+new counts. Wired 关注 into `colors.ts` (RISK_COLORS/RISK_LABEL), `aggregate.ts` RISK_W, `alerts.ts` RISK_WEIGHT, `i18n/messages.ts` (en+zh risk maps). `data.ts` getters `getImportExport/getRegulations/getSentiment`.
- **V-P1+P2** (`2a3d94d`) — `prep/lib/risk.ts` 3-tier `assessInspection` + `assessImport` + `assessRegulation` (compliance countdown); `prep/seeds.ts` (6 Import + 8 Regulation rows transcribed VERBATIM from the May report, bilingual); `prep/collect.ts` new collectors (`collectImportSeeds`, `collectFederalRegisterImport` auto, `collectRegulationSeeds`, `collectSentimentRSS`) + establishmentId capture + `main()` writes 5 record files + counts + SummaryMeta; `prep/validate.ts` validates the 3 new files; schema +`recommendedAction` on Import/Regulation.

**Current data (`data/v2/`, committed):** `regulatory.json` (141) · `inspections.json` (172, +establishmentId) · `import_export.json` (12) · `regulations.json` (8) · `sentiment.json` (15) · `meta.json` (with `summary` + per-module counts; 109 high-risk). All real (live pull) or curated-from-May-report (never fabricated).

> ⚠️ The new data exists & validates but is **NOT yet visible in the UI**, and the Excel export is still the **old 2-sheet** version. That is exactly what the remaining phases do.

## Data access (read via `src/lib/data.ts` — the only seam)
`getMeta()` (`.summary` drives Monthly Summary), `getRegulatory()`, `getInspections()`, `getImportExport()`, `getRegulations()`, `getSentiment()` — all return **servable** rows (reviewed && status!=='rejected'; sentiment also drops `excluded`). Enum option arrays in `schema.ts` `ENUM_OPTIONS` (now incl. `module`, `alertType`, `importAction`, `regStatus`, `regTopic`, `regJurisdiction`, `sentimentCategory`). Column-order arrays `SHEET1..4_COLUMNS` are the single source of truth for export.

## REMAINING phases

### V-P3 — Surfaces (biggest)
Reuse the existing **server-page → client-component** seam (copy `app/intelligence/page.tsx` + `src/components/intelligence/IntelligenceClient.tsx`; tables via `src/components/table/DataTable.tsx`; charts via `src/components/charts.tsx` (Recharts 3); primitives `src/components/ui.tsx` incl. `RiskBadge` (already 5-level)).
- **`app/page.tsx` → Monthly Summary / Exec Brief**: render `getMeta().summary` (reportName, scope, exclusions, keyHighlights, highRiskItems→links, keyActions) + a 5-tile KPI strip from `meta.counts` (Main/Import/Regs/Inspections/High-Risk) + **RiskHeatmap** (module × 5-level risk; build in V-P4). Keep the current overview charts (move below, or to `/intelligence`).
- **`app/import/page.tsx` + `ImportClient`**: DataTable over `getImportExport()`; facets agency/regulatoryAction/countryRegion/riskLevel; columns category/title(→sourceUrl)/agency/country/product/date/action/risk; bilingual.
- **`app/regulation/page.tsx` + `RegulationClient`**: DataTable over `getRegulations()` (facets jurisdiction/status/topic/risk) + the **ComplianceCountdownGantt** hero (V-P4) using `effectiveDate` vs today (2026-06-19).
- **`app/sentiment/page.tsx` + `SentimentClient`**: DataTable over `getSentiment()` (facets sentimentCategory/brand/risk) + incident-type bar; never render article bodies (link only).
- **Enhance `AppShell.tsx`**: add `/import`, `/regulation`, `/sentiment` to `NAV` (group into Intelligence / Modules / Analytics). Add i18n keys in `src/lib/i18n/messages.ts` to **BOTH** `en` and `zh` (zh is typed `: Messages` against `en` — a missing key fails typecheck): `nav.import`, `nav.regulation`, `nav.sentiment`, plus surface strings.
- **Enhance Alerts** (`app/alerts/page.tsx` + `AlertsClient` + `src/lib/alerts.ts`): generalize `buildAlertRows` to ingest import/regulation/sentiment too (currently only inspection+regulatory). Derive **alertType** from `record.module` (food_safety/import_compliance/state_local_reg/inspection); add a 4-type facet/tiles.
- **Inspections** (`InspectionsClient.tsx`): add an Establishment ID column + facet (data already has `establishmentId`).

### V-P4 — Richer aggregation/viz (the "too plain" fix) — dep-free where Recharts lacks a primitive
- **RiskHeatmap** (CSS grid, module × 5-level risk, opacity-scaled `RISK_COLORS`) — Overview centerpiece.
- **ComplianceCountdownGantt** (positioned divs/SVG): one bar per regulation `publicationPassageDate→effectiveDate` on a date axis with a "today" (2026-06-19) line, colored by days-to-effective (SB68 2026-07-01 & NY ~2026-11 render imminent). Regulation page hero.
- recall-cascade (Recharts v3 `Treemap` or indented list — California Dairies → downstream), import-by-country×agency (`GroupedBar`), repeat-offender leaderboard keyed on `establishmentId`, alerts-by-type. Add cross-module rollups to `src/lib/aggregate.ts`.

### V-P5 — Excel export rebuild (7 sheets, openpyxl from scratch)
Rewrite `prep/export_xlsx.py` with `openpyxl.Workbook()` (do **NOT** reuse the May `.xlsx` — it's the 6-sheet "no-café" variant with **zero risk fills** = the "too plain" artifact). Sheets: **1** 月度摘要 (from `meta.summary` + KPI table + risk-mix), **2** 食品安全主表 (12, `SHEET1_COLUMNS`), **3** 进口出口监管 (`SHEET3_COLUMNS`), **4** 州地方法规 (`SHEET4_COLUMNS`), **5** 咖啡馆检查 (`SHEET2_COLUMNS`, now incl. 门店编号), **6** 数据源日志 (from `meta.provenance` — module/status/notes/url), **7** 字段说明. Styling that fixes "plain": **5-level Risk-Level cell fills** (incl. Watch `FFF2CC`, high `F4CCCC`/`C00000`), navy bilingual headers, frozen panes, autofilter. Read data from `data/v2/*.json`; serve `reviewed` rows only. Update the header Export link/menu in `AppShell.tsx` if multiple files. Verify with openpyxl (7 sheets, fills, est-id col, pull-log).

### V-P6 — Docs + API keys + final verify
- **`docs/API_KEYS.md`** (the user explicitly asked): step-by-step to obtain each free key + which `.env` var + free-tier limits, for: **FDA OII Data Dashboard** (Import Refusals API, POST, `Authorization-User`+`Authorization-Key`), **LegiScan** (state bills, `LEGISCAN_KEY`, 30k/mo), **NY Senate OpenLegislation** (`NY_SENATE_KEY`), optional **OpenStates**, optional **Socrata app token**. Note: the key-gated collectors (FDA Import Refusals, LegiScan/NY-Senate bills) are **not yet built** — document how to enable; the modules currently run on Federal-Register-import auto + curated May seeds + RSS. Add a `postJson()` to `prep/lib/http.ts` when wiring FDA Refusals.
- Update `README.md` / `docs/RUNBOOK.md` / `docs/DATA_CONTRACT.md` for the 6-module/7-sheet V2.
- Final: `npm run typecheck` (both tsconfigs), `npm run build`, `npm run prep:collect && prep:validate && prep:export`, preview each route, confirm all-static + no runtime env.

## Gotchas & decisions (carry forward)
- **Recharts 3** (not 2) — v2 ResponsiveContainer renders empty under React 19; charts are client-only.
- **i18n**: `zh` is typed against `en` in `messages.ts` — add new keys to BOTH or typecheck fails. `RiskBadge` uses `colors.ts riskLabel` (already 5-level).
- **Preview**: use `.claude/launch.json` config **`preview`** (`npm run start`, binds reliably). The `dev` config (`next dev`) did NOT bind under the preview wrapper in earlier runs — build first, then preview the production server. Resize the preview viewport wide (e.g. 1440) before screenshots; it defaults narrow.
- **Manual-review gate is staged**: `collect.ts` auto-approves auto-collected rows (`reviewStatus:'approved'`). §10 "force-pending for high-risk" is opt-in/not enforced yet (so data stays visible). Don't flip it on without the user.
- **Never fabricate**: blanks stay null; auto-collected English leaves zh blank (UI falls back to en); curated/seed rows are bilingual. `data.ts` Zod-parses at module load → malformed data fails `next build`.
- **Live-source caveats** (in `meta.provenance`, surfaced on `/sources`): FSIS recall API 403s bots; Federal-Register import slug query 400s on one slug (partial, ~6 rows still come through); LA-2018/SF-2021 stale datasets pinned-avoided; Cambridge `ryb9-qzmw` is permits-not-inspections (0 rows, flagged).
- **All static on Vercel**, zero runtime env; export is a static file in `public/exports/` (regenerated by `prep:export`).

## Commands
```bash
npm run typecheck            # tsc app + prep (i18n completeness is the main trap)
npm run build                # next build — Zod-parses /data at module load
npm run prep:collect         # live pull + seeds → data/v2/*.json   (set HTTP_USER_AGENT)
npm run prep:validate        # Zod-validate all /data/v2 files
npm run prep:export          # openpyxl → public/exports/monthly_report.xlsx  (needs: pip install openpyxl)
```
Repo on branch `main` (greenfield, no remote yet). Reference reports live in `~/Downloads/2026年*月…xlsx` + the requirements `.docx`.
