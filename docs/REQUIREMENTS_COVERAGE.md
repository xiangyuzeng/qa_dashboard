# Requirements Coverage / 需求覆盖对照

Maps the requirements docx (`AI食品安全技术信息_进口合规_地方法规及舆情监控模型需求说明书.docx`, V1.0)
**and** the additional data sources the client named (DOL, OSHA/building codes, DEP/DSNY, NYC DCWP) to where
each is covered in the dashboard. Status legend: **live** = real one-time API pull · **seed** = curated,
source-linked authoritative rows (bilingual) · **dormant** = collector scaffolded behind the `FeedAdapter`
seam, off until a verified dataset id / key is wired (truthful `manual` stubs, no fabrication).

## A. Core modules (docx §三) — all built

| docx module | Dashboard module / route | Status | Notes |
|---|---|---|---|
| 模块一 Food Safety Intelligence | `food_safety` · `/intelligence` | live (167) | openFDA recalls + Federal Register + CDC; FSIS intermittently 403s |
| 模块二 Import/Export & Border | `import` · `/import` | live (58) | Federal Register import slugs + FDA OII Import Refusals (key-gated, active) + May-report seeds |
| 模块三 State & Local Regulation | `regulation` · `/regulation` | live (43) | LegiScan + NY Senate + OpenStates (key-gated, active) + curated named laws |
| 模块四 Café Inspection | `inspection` · `/inspections` | live (180) | NYC ABCEats/Open Data + others; 9-jurisdiction coverage; café/brand-scoped |
| 模块五 Negative Media & Sentiment | `sentiment` · `/sentiment` | live (15) | RSS (Food Safety News); link-only |
| 模块六 Reporting & Alerting | Overview · `/alerts` · 12-sheet xlsx + docx | built | 5-level risk · alerts · monthly report |

## B. Data-source appendix (docx 附录) — coverage

| docx source | Where | Status |
|---|---|---|
| FDA (recalls, Import Alert/Refusal, Warning Letter, FSVP, Prior Notice) | food_safety + import | live (recalls/refusals); Warning Letters = no clean JSON feed (manual) |
| USDA / FSIS | food_safety + import | live (FSIS recalls; 403-prone) |
| CDC | food_safety | live |
| EPA / CPSC / FTC | food_safety + **environment** + **consumer** | EPA & FTC now seeded as compliance rules (§C) |
| CBP / APHIS / Federal Register / USTR-DOC | import | live (Federal Register) + curated |
| State Health Departments + the 9 inspection jurisdictions (NYC, Bergen, Newark, LA, SF, Boston, Cambridge, DC, FL) | inspection · `/sources` | live where a public API exists; manual/OPRA + truthful `not_public_online` gaps elsewhere |

## C. Additional sources named by the client → the 4 new compliance domains (V2.5/2.6)

All 4 domains now span **8 jurisdictions** (Federal · NY State · NYC · NJ · CA · MA · FL · DC) with effective
dates from **1964 → 2027** (historical → recent amendments → pending/proposed). Multi-state rows render
`appliesToUs = 未评估` since Luckin has no stores there yet (honest; they are expansion-readiness reference).

| client source | Dashboard module / route | Status | Rows |
|---|---|---|---|
| **Department of Labor** (FLSA/FMLA/NLRB/EEOC) + NY/NJ/CA/MA/FL/DC labor agencies + **NYC DCWP** | `labor` · `/labor` | seed (multi-state) + **dormant** DOL `enforcedata` adapter | **100** |
| **Federal OSHA** (29 CFR 1910 suite) + state OSHA-plans + state/city **building & fire codes** + ADA + NFPA + permits | `building` · `/building` | seed (multi-state) + **dormant** OSHA-establishment / DOB-violations adapters | **88** |
| **卫生部 / Environment** — EPA (CWA/FOG/refrigerant/FIFRA) + DEP/DSNY + state organics/recycling/foodware/bottle-bills | `environment` · `/environment` | seed (multi-state) + **dormant** DSNY adapter | **85** |
| **Consumer & Worker Protection** — NYC DCWP + FTC suite (UDAP/endorsement/reviews/30-day) + NY GBL + state consumer-fraud + privacy | `consumer` · `/consumer` | seed (multi-state) + **dormant** DCWP-complaints adapter | **88** |

Total compliance-domain rows: **361** (was 62, originally 13). Every row is bilingual, web-verified, and links
its `sourceUrl`. Authored by a multi-agent research Workflow (author → adversarial-verify → dedup) — no fabrication.

## D. Scale-based applicability (docx + client emphasis) — the Applicability Engine

`/applicability` evaluates the real store footprint (30 NYC stores: 18 open / 7 planned / 5 closed) +
employee headcount against scale-gated rules (**17 rules**). Client-named thresholds, all implemented:

| Rule | Threshold | Basis | Current verdict |
|---|---|---|---|
| Menu calorie labeling | **≥ 15 stores** | open count | 适用 (18) |
| Added-sugar / sodium warnings | **≥ 15 stores** | open count | 适用 (18) |
| FDA federal menu labeling | ≥ 20 stores | open count | 临近 (18/20) |
| Fair Workweek + **Fast Food Just Cause** | **≥ 30 stores**, fast-food | open / open+planned / all-status (toggle) | on the line (18 / 25 / 30) |
| Commercial Organics (chain) | **≥ 8,000 sq ft combined** (single-site **7,000**) | NYC combined sqft | 适用 (21,156) — **verified 8,000/7,000** (client "7,200" was the single-site, which is 7,000) |
| FMLA / Title VII / ADEA / PWFA / salary-transparency / fair-chance / lactation | 50 / 15 / 20 / 15 / 4 / 4 / 4 **employees** | headcount | **待补充** (headcount not in ops extract) — flip live via the employee what-if slider |
| Paid Safe & Sick Leave | always (1+ employee) | — | 适用 |
| DEP FOG | size cutoffs to verify | — | 待核实 |

> **Coffee-shop focus (前期聚焦咖啡店):** every collector applies the 6-brand + café-keyword scope gate;
> the footprint roster is Luckin's own 30 NYC stores.

## E. Gaps & deferred (transparent)

- **Dormant live enforcement feeds** (DCWP/DOB/DSNY complaints+violations, DOL `enforcedata`, OSHA
  establishment search) are scaffolded behind `prep/lib/feed.ts` — activate by verifying each dataset id /
  adding a key, then `prep:domains`. No rows are fabricated while dormant.
- **Employee headcount** is null in the ops extract → employee-gated rules render 待补充 (not guessed). Set
  `company_profile.json → national.estimatedEmployeeCount` (or use the slider) to evaluate them.
- **Deferred (spec §8):** `/inspections` multi-agency generalization, CAMIS address-match enrichment
  (owned_stores has real addresses + geo → feasible vs NYC Open Data `43nn-pn8j`), `/benchmark` extension,
  `/regulation` cross-domain facet.
- **Not legal advice** (docx §十三): outputs are monitoring references; confirm with counsel before acting.
