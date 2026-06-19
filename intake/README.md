# Manual intake

For the jurisdictions with **no usable one-time API** (Washington DC, Newark NJ, Bergen County NJ, Florida FDACS, and current San Francisco), and for any offline source (OPRA responses, PDFs, emailed reports), records are entered here by hand.

## How to use
1. Copy `inspections.example.json` → `inspections.json` in this folder.
2. Add one object per inspection. Field names match the Sheet 2 schema (see `docs/DATA_CONTRACT.md`). Leave unknown fields `null` — **never fabricate** (hard rule).
3. For data with no public online source, set:
   - `"dataAvailability": "not_public_online"` (shows "Data not publicly available online / 未找到公开数据库" — never recorded as "no inspection", per the NJ special-handling rule),
   - `"sourceType": "OPRA/人工 Manual Request"`, and a `sourceUrlOrDocRef` (e.g. an OPRA request number),
   - `"njMunicipality"` / `"njRoutedTo"` for NJ routing.
4. Records start **unreviewed** (`"reviewed": false`). They will NOT appear in the dashboard or export until QA verifies and sets `"reviewed": true` (the human-review gate).
5. Re-run the refresh: `npm run prep:build` (collect → validate → export), then redeploy.

`intake/inspections.json` is **gitignored by default is not** — it is committed as prepared data like `/data`. If it contains anything sensitive, coordinate with QA before committing.
