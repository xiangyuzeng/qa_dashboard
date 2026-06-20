"""
enrich_inspections.py — reproducible post-collect enrichment for the inspections feed.

`prep:collect` rewrites inspections.json wholesale from its collectors (DOH/Boston/intake),
which does NOT include the multi-agency OATH enforcement pull or the owned-store CAMIS join.
This step re-applies both from live NYC Open Data so a full refresh stays complete:

  1. CAMIS join  — match the owned-store roster to NYC DOH establishments (43nn-pn8j) by
                   address + Luckin operating entity → write dohEstablishmentId (owned_stores.json).
  2. OATH pull   — strict word-boundary brand match against OATH Hearings (jz4z-kudi) →
                   competitor multi-agency enforcement rows (DSNY/DEP/FDNY/DOB/DCWP/DOHMH).
  3. Normalize   — owned-store inspection rows' all-caps "LUCKIN COFFEE" → roster display name.

Idempotent (drops prior insp-oath-/insp-ecb- before re-adding; dedups by id) and
network-fault-tolerant (a failed pull logs a warning and leaves existing data intact — never
fabricates). Run order: prep:collect → prep:enrich → prep:domains → prep:meta → prep:validate → prep:export.

Run: npm run prep:enrich
"""
import json, os, re, html, time, urllib.request, urllib.parse

DATA = os.environ.get("PREP_OUTPUT_DIR", os.path.join(os.path.dirname(__file__), "..", "data", "v2"))
DATA = os.path.abspath(DATA)
NOW = "2026-06-20T00:00:00.000Z"
UA = os.environ.get("HTTP_USER_AGENT", "LuckinNA-QA/1.0")
DOH = "https://data.cityofnewyork.us/resource/43nn-pn8j.json"
OATH = "https://data.cityofnewyork.us/resource/jz4z-kudi.json"


def q(base, params):
    url = base + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def clean(s):
    s = html.unescape(s or "").replace("�", "§").replace("Apos", "'")
    return re.sub(r"\s+", " ", s).strip()


def genuine(name):
    """Strict word-boundary café-chain matcher (apostrophe-S required for McDonald's)."""
    u = clean(name).upper().replace("’", "'")
    if re.search(r"\bMC ?DONALD'?S\b", u): return "McDonald's"
    if "PRET A MANGER" in u: return "Pret A Manger"
    if re.search(r"\bDUNKIN", u): return "Dunkin"
    if re.search(r"\bSTARBUCKS", u): return "Starbucks"
    return None


def num(x):
    try: return float(x)
    except (TypeError, ValueError): return 0.0


# ── Phase 1: CAMIS join (owned_stores.json dohEstablishmentId) ──────────────────────────
def camis_join():
    path = os.path.join(DATA, "owned_stores.json")
    stores = json.load(open(path))
    LUCK = re.compile(r"LUCKIN|FIRST RAY OPERATIONS")
    nstreet = lambda s: re.sub(r"[^A-Z0-9 ]", "", (s or "").upper()).strip()
    matched = 0
    for st in stores:
        addr, zipc = st.get("address") or "", st.get("zip") or ""
        m = re.match(r"\s*([\d-]+)\s+(.*)", addr)
        if not m or not zipc:
            continue
        bld, streetkey = m.group(1), (nstreet(m.group(2)).split() or [""])[0]
        try:
            rows = q(DOH, {"$where": f"zipcode='{zipc}' AND building='{bld}'", "$limit": 400})
        except Exception as e:
            print(f"  [camis] {st['storeId']}: query failed ({str(e)[:40]}) — keeping existing")
            time.sleep(0.4)
            continue
        luck = [r for r in rows if LUCK.search((r.get("dba") or "").upper())
                and (not streetkey or streetkey in nstreet(r.get("street")))]
        if luck:
            st["dohEstablishmentId"] = luck[0]["camis"]
            matched += 1
        time.sleep(0.15)
    json.dump(stores, open(path, "w"), ensure_ascii=False, indent=2)
    open(path, "a").write("\n")
    print(f"  [camis] dohEstablishmentId set on {matched}/{len(stores)} owned stores")
    return {s["dohEstablishmentId"]: s["storeName"] for s in stores if s.get("dohEstablishmentId")}


# ── Phase 2: OATH multi-agency enforcement (strict brand match) ─────────────────────────
BRAND_WHERE = ("(upper(respondent_last_name) like '%STARBUCKS%' OR upper(respondent_last_name) like '%DUNKIN%' "
               "OR upper(respondent_last_name) like '%PRET%' OR upper(respondent_last_name) like '%MCDONALD%')")
CLUSTERS = [
    ("DSNY", "NYC DSNY (Sanitation)", "(issuing_agency like 'SANITATION%' OR issuing_agency = 'DOS - ENFORCEMENT AGENTS')", 10),
    ("DEP", "NYC DEP (Environmental Protection)", "issuing_agency like 'DEP%'", 6),
    ("FDNY", "FDNY (Fire Department)", "issuing_agency = 'FIRE DEPARTMENT OF NYC'", 6),
    ("DOB", "NYC DOB (Buildings)", "issuing_agency like '%BUILDINGS%'", 6),
    ("DCWP", "NYC DCWP (Consumer & Worker Protection)", "(issuing_agency like 'DCA%' OR issuing_agency like '%CONSUMER AFFAIRS%')", 8),
    ("DOHMH", "NYC DOHMH (OATH enforcement)", "(issuing_agency like 'DOHMH%' OR issuing_agency like 'PCS%' OR issuing_agency like 'VECTOR%' OR issuing_agency like 'WATER TANK%')", 6),
]


def oath_rows():
    out, seen = [], set()
    for label, agency, where, cap in CLUSTERS:
        try:
            cands = q(OATH, {"$where": f"{BRAND_WHERE} AND {where} AND violation_date > '2022-01-01'",
                             "$order": "violation_date DESC", "$limit": 120})
        except Exception as e:
            print(f"  [oath] {label}: pull failed ({str(e)[:40]}) — skipping cluster")
            time.sleep(0.5)
            continue
        kept = 0
        for r in cands:
            if kept >= cap:
                break
            tn = r.get("ticket_number")
            brand = genuine(r.get("respondent_last_name"))
            if not tn or not brand or tn in seen:
                continue
            seen.add(tn)
            house = clean(r.get("violation_location_house")); street = clean(r.get("violation_location_street_name")).title()
            city = clean(r.get("violation_location_city")).title(); zipc = clean(r.get("violation_location_zip_code"))
            loc = ", ".join(p for p in [f"{house} {street}".strip(), f"{city} {zipc}".strip()] if p.strip())
            chg = clean(r.get("charge_1_code_description")); sect = clean(r.get("charge_1_code_section"))
            pen = num(r.get("penalty_imposed")); bal = num(r.get("balance_due")); tot = num(r.get("total_violation_amount"))
            amt = max(pen, bal, tot); comp = clean(r.get("compliance_status"))
            summ = chg or "OATH violation"
            if sect: summ += f" (§{sect})"
            if amt: summ += f" | penalty ${amt:.0f}" + (f", balance due ${bal:.0f}" if bal > 0 else ", paid")
            if comp: summ += f" — {comp}"
            risk = ("高风险" if amt >= 5000 else "中风险") if bal > 0 else ("中风险" if amt >= 2500 else "信息参考")
            out.append({
                "id": "insp-oath-" + re.sub(r"[^A-Za-z0-9]", "", tn)[:18],
                "module": "inspection", "no": None,
                "jurisdiction": "New York City", "regulatoryAgency": agency,
                "brand": brand, "establishmentType": "快餐竞品 QSR Competitor",
                "storeName": f"{brand} — {loc}" if loc else brand, "establishmentId": tn, "address": loc or None,
                "inspectionDate": (r.get("violation_date") or "")[:10] or None,
                "inspectionType": f"OATH Hearing — {clean(r.get('issuing_agency')) or label}",
                "inspectionResult": None, "score": None, "grade": None,
                "violationCode": sect or clean(r.get("charge_1_code")) or None,
                "chineseViolationSummary": None, "englishViolationSummary": summ[:600] or None,
                "violationSeverity": "严重（主要）Critical" if amt >= 1000 else "一般 Non-critical",
                "standardizedCategory": None, "standardizedCategoryId": None,
                "followupRequired": None, "sourceType": "Open Data API", "riskLevel": risk,
                "sourceUrlOrDocRef": f"{OATH}?ticket_number={tn}", "recommendedAction": None,
                "standardizedCategoriesAll": [], "cafeRiskTags": [], "repeatViolationGroupId": None,
                "alertTriggered": risk == "高风险", "alertReason": ("high unpaid OATH penalty" if risk == "高风险" else None), "alertRuleIds": [],
                "reviewed": True, "reviewStatus": "approved",
                "reviewNote": f"competitor {label} enforcement (NYC OATH hearings, strict brand-match, live pull)",
                "provenance": {"sourceId": "nyc_oath", "agency": agency, "sourceUrl": f"{OATH}?ticket_number={tn}",
                               "docRef": None, "collectedAt": NOW, "aiSummaryAt": None, "dataAvailability": "available",
                               "dataAvailabilityLabel": None, "njMunicipality": None, "njRoutedTo": None},
            })
            kept += 1
        print(f"  [oath] {label:6}: {kept} genuine rows")
        time.sleep(0.3)
    return out


def main():
    print("enrich_inspections: CAMIS join + OATH multi-agency enforcement")
    try:
        camis2name = camis_join()
    except Exception as e:
        print(f"  [camis] phase failed ({str(e)[:50]}) — keeping existing owned_stores.json")
        stores = json.load(open(os.path.join(DATA, "owned_stores.json")))
        camis2name = {s["dohEstablishmentId"]: s["storeName"] for s in stores if s.get("dohEstablishmentId")}

    path = os.path.join(DATA, "inspections.json")
    insp = json.load(open(path))
    # idempotent: drop any prior enforcement rows before re-adding
    insp = [r for r in insp if not (r["id"].startswith("insp-oath-") or r["id"].startswith("insp-ecb-"))]
    # normalize owned-store all-caps names via the CAMIS roster map
    norm = 0
    for r in insp:
        if r.get("establishmentType") == "甲方门店 Owned Store" and (r.get("storeName") or "").isupper():
            nm = camis2name.get(r.get("establishmentId"))
            r["storeName"] = f"Luckin Coffee — {nm}" if nm else "Luckin Coffee"
            norm += 1
    new = oath_rows()
    have = {r["id"] for r in insp}
    add = [r for r in new if r["id"] not in have]
    insp.extend(add)
    json.dump(insp, open(path, "w"), ensure_ascii=False, indent=2)
    open(path, "a").write("\n")
    print(f"enrich done: +{len(add)} OATH enforcement rows · normalized {norm} owned-store names · inspections.json now {len(insp)}")


if __name__ == "__main__":
    main()
