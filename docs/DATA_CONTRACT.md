# Data contract (`/data/v2`)

Authoritative schema: `src/lib/schema.ts` (Zod). Field names mirror
`templates/monthly_report.xlsx` 1:1 so Excel export is a direct write-back. Enum strings are
copied **verbatim** from the workbook's `_lists` sheet — do not normalize (e.g. `Washington DC`,
`Florida (FDACS)`, `其他 Other`, `严重（主要）Critical`). Unknown = `null`/`""` (never fabricated).

## Files
| File | Shape |
|---|---|
| `regulatory.json` | `RegulatoryRecord[]` — Sheet 1 (federal/recall feed) |
| `inspections.json` | `InspectionRecord[]` — Sheet 2 (café/brand inspections) |
| `violation_categories.json` | 19 categories `{id, zh, en, cafeHighFrequency, note}` |
| `brands.json` | priority brands + aliases + café keywords |
| `jurisdictions.json` | 9 jurisdictions (data source, access, pinned endpoint, feasibility, staleness) + alert rules |
| `meta.json` | `{schemaVersion, dataAsOf, reportingPeriod, generatedAt, isSeedData, counts, provenance[]}` |

## RegulatoryRecord (Sheet 1, 12 canonical cols + enrichment)
`id, no, category, chineseTitle, englishTitle, source, publicationDate, chineseSummary,
englishSummary, sourceUrl, riskLevel, relevanceNotes, recommendedAction`
— enrichment: `relevanceTags[]` (coffee/dairy/beverage/additive/allergen/labeling/packaging),
`alertTriggered, alertReason, alertRuleIds[]`, `reviewed, reviewStatus, reviewNote`, `provenance`.

## InspectionRecord (Sheet 2, 22 canonical cols + enrichment)
`id, no, jurisdiction, regulatoryAgency, brand, establishmentType, storeName, address,
inspectionDate, inspectionType, inspectionResult, score, grade, violationCode,
chineseViolationSummary, englishViolationSummary, violationSeverity, standardizedCategory,
followupRequired, sourceType, riskLevel, sourceUrlOrDocRef, recommendedAction`
— enrichment: `standardizedCategoryId (1–19), standardizedCategoriesAll[], cafeRiskTags[]`
(13-value set from spec §11.2), `repeatViolationGroupId`, `alertTriggered, alertReason,
alertRuleIds[]`, `reviewed, reviewStatus, reviewNote`, `provenance`.

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
source URL/doc ref.
