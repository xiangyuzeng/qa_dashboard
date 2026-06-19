# Jurisdiction & source playbook

Per-source access notes, robots/ToS posture, and the manual-intake procedure. Endpoints are
verified and pinned in `data/v2/jurisdictions.json` / `prep/collect.ts`. **Hard rules:** prefer
official APIs/Open Data; respect each robots.txt + ToS; descriptive User-Agent; rate-limit; never
bypass CAPTCHA/bot-detection (route to manual intake on a block); never fabricate.

## Federal / regulatory
| Source | Access | Status | Notes |
|---|---|---|---|
| openFDA food enforcement (recalls) | official API, JSON, no key | ✅ pulled | relevance-filtered to monitored categories |
| Federal Register | official API, JSON, no key | ✅ pulled | term queries: coffee, dairy, allergen labeling, additive, beverage |
| CDC NORS outbreaks | Socrata open-data | ✅ pulled | annual, lags ~2–3 yrs; filter `primary_mode='Food'` |
| USDA/FSIS recalls | official API, JSON | ⚠️ blocked | endpoint genuine but CDN returns 403 to bots; retry from a non-datacenter IP with a real UA, or manual |
| FDA Warning Letters | bulk XML/CSV (data.gov) | ⚠️ manual | XML URL needs re-verification; not in openFDA — download + parse offline |

## Jurisdictions (café/priority-brand scope only — spec §7)
| Jurisdiction | Source | Status | Notes |
|---|---|---|---|
| New York City | NYC Open Data DOHMH `43nn-pn8j` (Socrata) | ✅ pulled | one row/violation → grouped by camis+date; ABCEats is the UI over this |
| Boston | Analyze Boston CKAN `4582bec6…` | ✅ pulled | one row/violation → grouped by license+date |
| Cambridge | Socrata `ryb9-qzmw` | ⚠️ wrong dataset | this id is **permit cases**, not violation-level inspections — find the correct sanitary-inspections resource or use manual intake |
| Los Angeles County | LA County ArcGIS Hub CSV (item `19b6607…`) | ⚠️ manual | large CSV; needs column mapping or a manual export. **Do NOT use `data.lacity.org/29fd-3paw` — frozen at 2018** |
| San Francisco | DataSF LIVES `pyih-qa8i` | ⚠️ manual | LIVES feed frozen ~2021; successor `6ud7-8ksb` empty — manual until a live feed is confirmed |
| Washington DC | HealthSpace `dc.healthinspections.us` | ⚠️ manual | HTML/PDF reports, no open dataset — per-record intake |
| Newark, NJ | Newark Health Inspection Lookup + Food & Drug Bureau | ⚠️ manual | JS/CAPTCHA-gated lookup — do not bypass; OPRA via the bureau |
| Bergen County, NJ | NWBRHC + municipal OPRA | ❌ no DB | no online database — OPRA request per municipality (~10 business days) |
| Florida (FDACS) | FDACS Food Permit Center | ❌ no scrape | `fdacs.gov` robots.txt default-deny + disallows `/search` — manual UI or public-records request |

## Manual intake (DC / Newark / Bergen / FL / SF / offline)
1. Collect records via the jurisdiction's web lookup, OPRA response, PDF, or email.
2. Enter them in `intake/inspections.json` (template: `intake/inspections.example.json`; fields per
   `DATA_CONTRACT.md`). Leave unknowns `null`.
3. For data with no public online source: `dataAvailability:"not_public_online"`,
   `sourceType:"OPRA/人工 Manual Request"`, a `sourceUrlOrDocRef` (OPRA #), and NJ `njMunicipality`/`njRoutedTo`.
4. Records start `reviewed:false` → appear only after QA sets `reviewed:true`.
5. Re-run `npm run prep:build`, commit, redeploy.

## New Jersey special handling (spec §11.1)
No statewide DB → identify municipality by address → route to the local health department / regional
health commission → prefer online lookup → mark `OPRA / Manual Request Required` when none → **never**
record a gap as "no inspection"; label unavailable data "Data not publicly available online / 未找到公开数据库".
