# Data contract (`/data/v2`)

Authoritative schema: `src/lib/schema.ts` (Zod). Field names mirror
`templates/monthly_report.xlsx` 1:1 so Excel export is a direct write-back. Enum strings are
copied **verbatim** from the workbook's `_lists` sheet — do not normalize (e.g. `Washington DC`,
`Florida (FDACS)`, `其他 Other`, `严重（主要）Critical`). Unknown = `null`/`""` (never fabricated).

**V2:** risk is **5-level** (adds `关注` Watch — recurrence/worsening-trend/escalation potential, excluded
from the high-risk KPI); records carry a `module` tag (`food_safety|import|regulation|inspection|sentiment`)
and alerts a 4-value `alertType` (`food_safety|import_compliance|state_local_reg|inspection`).

## Files
| File | Shape |
|---|---|
| `regulatory.json` | `RegulatoryRecord[]` — Sheet 1 (federal/recall feed; Module 1) |
| `inspections.json` | `InspectionRecord[]` — Sheet 5 (café/brand inspections; Module 4; now incl. `establishmentId`) |
| `import_export.json` | `ImportExportRecord[]` — Sheet 3 (Import/Export & Border Control; Module 2) |
| `regulations.json` | `RegulationRecord[]` — Sheet 4 (State & Local Regulation; Module 3) |
| `sentiment.json` | `SentimentRecord[]` — Module 5 (feeds the Summary + `/sentiment`; **no own export sheet**) |
| `violation_categories.json` | 19 categories `{id, zh, en, cafeHighFrequency, note}` |
| `brands.json` | priority brands + aliases + café keywords |
| `jurisdictions.json` | 9 jurisdictions (data source, access, pinned endpoint, feasibility, staleness) + alert rules |
| `meta.json` | `{schemaVersion, dataAsOf, reportingPeriod, generatedAt, isSeedData, counts, summary, provenance[]}` |

## RegulatoryRecord (Sheet 1, 12 canonical cols + enrichment)
`id, no, category, chineseTitle, englishTitle, source, publicationDate, chineseSummary,
englishSummary, sourceUrl, riskLevel, relevanceNotes, recommendedAction`
— enrichment: `relevanceTags[]` (coffee/dairy/beverage/additive/allergen/labeling/packaging),
`alertTriggered, alertReason, alertRuleIds[]`, `reviewed, reviewStatus, reviewNote`, `provenance`.

## InspectionRecord (Sheet 5, 23 canonical cols + enrichment)
`id, no, jurisdiction, regulatoryAgency, brand, establishmentType, storeName, establishmentId,
address, inspectionDate, inspectionType, inspectionResult, score, grade, violationCode,
chineseViolationSummary, englishViolationSummary, violationSeverity, standardizedCategory,
followupRequired, sourceType, riskLevel, sourceUrlOrDocRef, recommendedAction`
— `establishmentId` (NYC camis / Boston licenseno / facility id) is the stable repeat-offender join key.
— enrichment: `standardizedCategoryId (1–19), standardizedCategoriesAll[], cafeRiskTags[]`
(13-value set from spec §11.2), `repeatViolationGroupId`, `alertTriggered, alertReason,
alertRuleIds[]`, `reviewed, reviewStatus, reviewNote`, `provenance`.

## ImportExportRecord (Sheet 3, 16 cols + enrichment) — Module 2
`id, module, no, category, chineseTitle, englishTitle, agency, countryRegion, productInvolved,
publicationDate, regulatoryAction, chineseSummary, englishSummary, importExportImpact,
documentationRequirement, riskLevel, sourceUrl, recommendedAction` — enrichment `relevanceTags[]`,
alert + review + `provenance`. `regulatoryAction` ∈ ImportActionEnum (Import Alert / Refusal / Detention / …).

## RegulationRecord (Sheet 4, 16 cols + enrichment) — Module 3
`id, module, no, jurisdiction, regulationBillName, chineseTitle, englishTitle, status,
publicationPassageDate, effectiveDate, coveredEntities, keyRequirements, chineseSummary,
englishSummary, businessImpact, riskLevel, sourceUrl, recommendedAction` — enrichment `topic`
(RegTopicEnum), alert + review + `provenance`. `effectiveDate` drives the compliance-countdown view.

## SentimentRecord (Module 5 — no export sheet)
`id, module, no, sentimentCategory, chineseTitle, englishTitle, outlet, brandMentioned,
publicationDate, chineseSummary, englishSummary, sourceUrl, riskLevel, credibility, excluded,
exclusionReason` — link only (never rehost article bodies); `excluded` rows are kept for audit but
filtered from the UI/Summary. Feeds the Monthly Summary KPI + risk-mix only.

## provenance (both record types)
`{ sourceId, agency, sourceUrl, docRef, sourceType, collectedAt, dataAvailability, dataAvailabilityLabel, njMunicipality, njRoutedTo }`.
`dataAvailability` is 3-state: `available | unknown | not_public_online` — NJ/manual gaps are
encoded truthfully ("Data not publicly available online / 未找到公开数据库"), never as "no inspection".

## Enrichment semantics (computed in `prep/`)
- **standardizedCategory** — keyword classification of the violation text → one of the 19 (heuristic
  stand-in for the spec's AI step; original text always retained). `prep/lib/classify.ts`.
- **risk + alerts** — per-jurisdiction thresholds (spec §10.1): NYC grade C/Pending; LA grade C/score<80;
  SF Closed/Fail/Conditional; Boston/Cambridge Fail/Closed/Permit; DC Fail; FL Stop Sale/Closure;
  Newark/Bergen Unsatisfactory; general closure/permit/stop-sale; store-level repeat. `prep/lib/risk.ts`.
  riskLevel = alert→高风险, fail-ish→中风险, else→低风险. (Pest/sewage are kept as café/category data,
  not auto-alerts, to avoid keyword-driven noise — tune in `risk.ts`.)
- **repeatViolationGroupId** — hash of normalized `storeName+address | jurisdiction | categoryId`,
  set when ≥2 inspections of the same physical store share a category.
- **review gate** — `reviewed && reviewStatus!=='rejected'` is what `src/lib/data.ts` and the export serve.

The validator (`prep/validate.ts`) enforces all of the above + that every `available` record carries a
source URL/doc ref + that the SHEET1..4 export-column lengths are 12/23/16/16 (drift guard).

## meta.json — V2 additions
- **`counts`** adds `importExport`, `regulation`, `sentiment`, `highRisk`, `watch` (alongside `regulatory`,
  `inspections`, `alerts`, `pendingReview`, `bySource`).
- **`summary`** (`SummaryMeta`, nullable) drives the Monthly Summary surface + Excel Sheet 1:
  `reportNameZh/En, scopeZh/En, exclusions[{zh,en}], keyHighlights[{zh,en}],
  highRiskItems[{recordId, module, titleZh, titleEn, riskLevel, href}], keyActions[{zh,en}]`.
- **`provenance[]`** (`SourceProvenance`) adds `module` + `status` (PullStatusEnum:
  `fetched|filtered|no_update|manual|excluded`) for the Sheet 6 data-source log / `/sources`.

## 7-sheet Excel export (`prep/export_xlsx.py`)
Built from scratch with `openpyxl.Workbook()` (not a template). Sheets & sources:
1. **月度摘要** ← `meta.summary` + `counts` + a module×5-level risk-mix matrix.
2. **食品安全主表** ← `SHEET1_COLUMNS` (RegulatoryRecord, 12).
3. **进口出口监管** ← `SHEET3_COLUMNS` (ImportExportRecord, 16).
4. **州地方法规** ← `SHEET4_COLUMNS` (RegulationRecord, 16).
5. **咖啡馆检查** ← `SHEET2_COLUMNS` (InspectionRecord, 23, incl. 门店编号).
6. **数据源日志** ← `meta.provenance` (source/module/status/records/URL/notes).
7. **字段说明** — per-module field guide + risk-color & status legends.
Styling: 5-level Risk-Level cell fills (`高风险 F4CCCC`, `中风险 FCE4D6`, `低风险 E2EFDA`, `信息参考 FFF2CC`,
`关注 D9EAD3`; high-risk rows also get the red fill + bold), navy bilingual frozen headers, autofilter.
The column orders mirror `SHEET1..4_COLUMNS` in `schema.ts` (Python hardcodes + asserts the lengths;
`validate.ts` prints/asserts them too). `export_xlsx.py` `verify()` reopens the file and asserts the
7 sheets / 门店编号 col / a high-risk fill / pull-log rows. Serves `reviewed` rows only.
