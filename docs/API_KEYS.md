# API Keys — optional key-gated collectors (NOT yet wired)

These collectors are **documented for a future refresh**, not built yet. Today the V2 modules run on:

- **Module 2 (Import/Export)** — Federal Register agency-slug pull (auto, no key) + curated seeds transcribed from the May 2026 report.
- **Module 3 (State & Local Regulation)** — curated seeds from the May 2026 report (named state/local laws).
- **Module 5 (Sentiment)** — Food Safety News / Google News RSS (auto, no key).

> ⚠️ **Adding a key does NOT auto-activate anything** until the matching collector is built (each is flagged "NOT built" below). When a key is absent, the intended collector must record **0 rows + a truthful provenance stub** (`status: manual` / `no_update`) — it must **never fabricate** rows. This mirrors the existing live-source discipline in `prep/collect.ts`.

The POST infra for keyed APIs already exists: `postJson()` in `prep/lib/http.ts` (custom headers + JSON body + the shared UA/pacing/retry-backoff).

Each section below: **where to register · what you get · free-tier limit · `.env` var(s) · activation note.**

---

## FDA OII Data Dashboard — Import Refusals (Module 2)
- **Register:** FDA Open Data / OII Unified Logon portal — request API credentials for the OII Data Dashboard.
- **Auth:** POST requests with headers `Authorization-User: <FDA_OII_USER>` and `Authorization-Key: <FDA_OII_KEY>` (use `postJson(url, body, { headers: { "Authorization-User": ..., "Authorization-Key": ... } })`).
- **Free-tier:** per FDA OII terms (document the published cap when registering).
- **`.env`:** `FDA_OII_USER`, `FDA_OII_KEY`.
- **Activation:** a future `collectImportRefusals()` in `prep/collect.ts`. **NOT built** → Module 2 stays on Federal-Register-import + May seeds. Absent key ⇒ truthful `manual`/`no_update` provenance stub (never a fabricated refusal).

## LegiScan — state bills (Module 3)
- **Register:** legiscan.com → free account → API key.
- **Free-tier:** 30,000 queries/month.
- **`.env`:** `LEGISCAN_KEY`.
- **Activation:** a future `collectLegiScanBills()` (best for CA SB68, multi-state menu-labeling/allergen/added-sugar bills). **NOT built** → Module 3 runs on curated May-report regulation seeds.

## NY Senate OpenLegislation — NY bills (Module 3)
- **Register:** legislation.nysenate.gov → request an API key.
- **Free-tier:** generous; per published terms.
- **`.env`:** `NY_SENATE_KEY`.
- **Activation:** a future `collectNYSenateBills()` (e.g. NY S5381 allergen labeling). **NOT built**.

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
