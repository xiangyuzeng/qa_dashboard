# API Keys — optional key-gated collectors (BUILT; dormant until a key is added)

These collectors are **built and wired** in `prep/collect.ts`, but ship **dormant**: with no key in `.env` each emits a truthful `manual` provenance stub (0 rows, never fabricated). Add the key + re-run `npm run prep:collect` to activate. Today (no keys set) the V2 modules run on:

- **Module 2 (Import/Export)** — Federal Register agency-slug pull (auto, no key) + curated seeds transcribed from the May 2026 report.
- **Module 3 (State & Local Regulation)** — curated seeds from the May 2026 report (named state/local laws).
- **Module 5 (Sentiment)** — Food Safety News / Google News RSS (auto, no key).

> ✅ **The collectors are built.** Add the matching key to `.env` and re-run `npm run prep:collect` to activate it; with no key it stays dormant and records **0 rows + a truthful provenance stub** (`status: manual`, visible on `/sources`) — never a fabricated row. This mirrors the existing live-source discipline in `prep/collect.ts`.

The POST infra for keyed APIs already exists: `postJson()` in `prep/lib/http.ts` (custom headers + JSON body + the shared UA/pacing/retry-backoff).

Each section below: **where to register · what you get · free-tier limit · `.env` var(s) · activation note.**

---

## FDA OII Data Dashboard — Import Refusals (Module 2)
- **Register:** FDA Open Data / OII Unified Logon portal — request API credentials for the OII Data Dashboard.
- **Auth:** POST requests with headers `Authorization-User: <FDA_OII_USER>` and `Authorization-Key: <FDA_OII_KEY>` (use `postJson(url, body, { headers: { "Authorization-User": ..., "Authorization-Key": ... } })`).
- **Free-tier:** per FDA OII terms (document the published cap when registering).
- **`.env`:** `FDA_OII_USER`, `FDA_OII_KEY`.
- **Activation:** `collectImportRefusals()` in `prep/collect.ts` — **BUILT**. POSTs to `https://api-datadashboard.fda.gov/v1/import_refusals` and keeps only food-relevant refusals (coffee/tea/dairy/beverage + human-food). Dormant until `FDA_OII_USER`+`FDA_OII_KEY` are set; absent key ⇒ truthful `manual` provenance stub (never a fabricated refusal). Module 2 also keeps Federal-Register-import + May seeds.

## LegiScan — state bills (Module 3)
- **Register:** legiscan.com → free account → API key.
- **Free-tier:** 30,000 queries/month.
- **`.env`:** `LEGISCAN_KEY`.
- **Activation:** `collectLegiScanBills()` — **BUILT**. `getSearch` over CA/NY/NJ/MA/FL for menu-labeling/allergen/added-sugar/PFAS bills. Dormant until `LEGISCAN_KEY` is set. Module 3 also keeps the curated May-report seeds (live bills may overlap a seeded law — both are real; QA dedupes at review).

## NY Senate OpenLegislation — NY bills (Module 3)
- **Register:** legislation.nysenate.gov → request an API key.
- **Free-tier:** generous; per published terms.
- **`.env`:** `NY_SENATE_KEY`.
- **Activation:** `collectNYSenateBills()` — **BUILT**. `/api/3/bills/search` for NY food-labeling/allergen bills (e.g. NY S5381). Dormant until `NY_SENATE_KEY` is set.

## OpenStates — multi-state bills (Module 3, optional)
- **Register:** openstates.org/accounts → free API key.
- **Free-tier:** per published terms.
- **`.env`:** `OPENSTATES_KEY`.
- **Activation:** optional alternative to LegiScan for multi-state coverage. **NOT built**.

## Socrata App Token (optional — already supported, LIVE)
- **Register:** any Socrata portal (e.g. data.cityofnewyork.us) → app token.
- **Free-tier:** anonymous ~1,000 req/hr; a token raises the ceiling.
- **`.env`:** `SOCRATA_APP_TOKEN` (already read by `prep/lib/http.ts` `socrata()`).
- **Activation:** **live today** — purely raises the throttle ceiling for NYC/CDC/Cambridge pulls; not required.

---

## Truthfulness rule (applies to all of the above)
Every keyed source that yields no data records **0 rows + a provenance note** (`status: manual` or `no_update`), exactly like the existing live-source caveats surfaced on `/sources`. A missing key or a blocked source is **never** represented as a fabricated record.
