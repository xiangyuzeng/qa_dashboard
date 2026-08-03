#!/usr/bin/env python3
"""
Store-footprint refresh — updates data/v2/owned_stores.json + company_profile.json from a
read-only ops-DB extract. These two files are the Applicability Engine's INPUT: the denominators
every scale-gated rule is measured against (location counts for Fair Workweek / menu warnings,
combined floor area for Commercial Organics).

Source (read-only, mcp-db-gateway server `aws-luckyus-opshop-rw`):
  - luckyus_opshop.t_shop_info      store master (id/name/status/dates/address/geo)
  - luckyus_opshop.t_shop_resource  physical attrs (usable area, seats), joined on dept_id
Scope: tenant='LKUS' (the US operation). tenant='IQA2' is QA test data (Cook Islands / Lesotho
coords) and is excluded entirely.

Extraction rules (unchanged since the original 2026-06-20 extract):
  - t_shop_resource.square_size is 使用面积 (usable area) recorded in SQUARE METERS. Magnitude
    (20-311 m^2 -> ~215-3351 sqft) fits Manhattan grab-and-go cafes, and the values back-convert
    to clean round sqft (92.9->1000, 162.58->1750, 139.35->1500), confirming they were originally
    lease sqft figures stored as m^2. We convert m^2 -> sqft (x10.7639).
  - Sentinel placeholders 1111 / 11111 (entered for not-yet-open pipeline stores) mean UNKNOWN
    -> null. NEVER guessed.
  - status: 1=open (has open date), 2=planned, 5=closed/withdrawn (never opened).
  - internal=1 facilities are test/commissary kitchens, NOT retail — excluded from the roster.

  ⚠️  THIS IS A PATCH, NOT A REGENERATION — and that distinction is load-bearing.

owned_stores.json carries fields that do NOT come from the ops DB and cannot be recomputed here:
  - dohEstablishmentId  NYC DOH CAMIS id (added by the v2.8 CAMIS enrichment, 11 stores linked;
                        the ops DB has only scanned licence IMAGES, no structured numbers)
  - licenseNumbers, reviewed, brand, establishmentType
company_profile.json likewise carries estimatedEmployeeCount / _employeeCountNote (headcount is
not in the ops extract; it gates the employee-based rules).

The pre-2026-08 version of this script rebuilt both files from scratch and clobbered all of the
above — running it against the current repo wiped all 11 CAMIS links and reverted the roster by
six weeks. So: we recompute ONLY the ops-derived fields and merge them onto the committed rows,
leaving every other field untouched. Rows are matched by storeId.

Usage:
  python3 prep/build_footprint.py            # dry-run — print the field-by-field diff, write nothing
  python3 prep/build_footprint.py --apply    # write the changes

After --apply, regenerate the engine verdicts and exports:
  npm run prep:domains && npm run prep:validate && npm run prep:export
"""
import json
import os
import re
import sys
from statistics import median

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "v2")

AS_OF = "2026-08-03"
SOURCE = ("luckyus_opshop.t_shop_info + luckyus_opshop.t_shop_resource "
          "(mcp-db-gateway: aws-luckyus-opshop-rw)")
SQM_TO_SQFT = 10.7639
PLACEHOLDERS = {1111.0, 11111.0}
STATUS_MAP = {1: "open", 2: "planned", 5: "closed"}
NYC_BOROUGH_CITIES = {"new york", "manhattan", "brooklyn", "bronx", "queens",
                      "staten island", "long island city"}

# Raw rows from the read-only join above, as of AS_OF. To refresh: re-run the extract and replace
# this block (keep the column order).
# cols: shop_no, name, status, open_date, address, lat, lng, dept_id, usage_sqm, build_sqm,
#       seats, has_food_lic_img, internal
ROWS = [
 ("US00001","8th & Broadway",1,"2025-06-30","755 Broadway, New York , NY 10003",40.730548,-73.992624,1127,84.0,84.0,8,1,0),
 ("US00002","28th & 6th",1,"2025-06-30","800 6th Ave, New York, NY 10001",40.745666,-73.990592,1128,90.0,90.0,8,1,0),
 ("US00003","100 Maiden Ln",1,"2025-09-09","100 Maiden Ln, New York, NY 10038",40.706675,-74.007198,1140,68.0,68.0,8,1,0),
 ("US00004","37th & Broadway",1,"2025-11-20","1375 Broadway, New York, NY 10018",40.752559,-73.987833,20011,97.5,97.5,10,1,0),
 ("US00005","54th & 8th",1,"2025-08-24","901 8th Ave, New York, NY 10019",40.76465,-73.984773,1141,60.0,60.0,0,1,0),
 ("US00006","102 Fulton",1,"2025-08-28","102 Fulton St, New York, NY 10038",40.709656,-74.00679,20010,65.0,66.0,6,1,0),
 ("US00007","108th & Broadway",1,"2026-04-30","2799 Broadway, New York, NY 10025",40.802905,-73.967925,20009,177.78,177.78,0,0,0),
 ("US00008","33rd & 10th",1,"2025-12-01","410 10th Ave, New York, NY 10001",40.753774,-73.999053,20008,214.88,214.88,16,1,0),
 ("US00009","48th & 3rd",1,"2026-06-30","770 3rd Ave, New York, NY 10017",40.754363,-73.972121,20015,141.86,141.86,0,0,0),
 ("US00010","154 Bleecker",1,"2026-04-28","154 Bleecker St, New York, NY 10012",40.728185,-73.999602,20016,101.11,101.11,0,0,0),
 ("US00011","180 Varick",2,None,"180 Varick St, New York, NY 10014",40.727598,-74.005142,20017,100.0,100.0,8,1,0),
 ("US00012","16th & 6th",1,"2026-03-23","555 6th Ave, New York, NY 10011",40.738418,-73.996378,20019,88.0,88.0,0,1,0),
 ("US00013","Grand Central Terminal",1,"2026-06-30","52 Vanderbilt Ave, Lower Level, New York, NY 10017",40.754291,-73.977128,20020,62.25,62.25,0,0,0),
 ("US00014","25 Park Row",5,None,"146 Chambers St, New York, NY 10007",40.715592,-74.009858,20021,1111.0,11111.0,0,0,0),
 ("US00015","41st & Lexington",1,"2026-04-30","369 Lexington Ave, New York, NY 10017",40.750579,-73.976431,20022,94.44,94.44,0,0,0),
 ("US00016","Reade & Broadway",5,None,"291 Broadway, New York, NY 10007",40.714923,-74.006079,20023,1111.0,1111.0,0,0,0),
 ("US00017","63rd & 3rd",5,None,"219 9th Ave, New York, NY 10011",40.746667,-74.0014,20024,1111.0,11111.0,0,0,0),
 ("US00018","40th & 10th",1,"2026-05-20","550 10th Ave, New York, NY 10018",40.758497,-73.996096,20025,92.9,92.9,0,0,0),
 ("US00019","29th & 3rd",1,"2026-04-11","401 3rd Ave, New York, NY 10016",40.742275,-73.980474,20026,161.0,161.0,10,1,0),
 ("US00020","21st & 3rd",1,"2026-02-06","261 3rd Avenue, New York, NY 10010",40.737333,-73.983894,20027,162.58,162.58,18,1,0),
 ("US00021","128 W 32nd St",1,"2026-07-16","128 W 32nd St, New York, NY 10001",40.748921,-73.990053,20028,311.31,311.31,0,0,0),
 ("US00022","23rd & 8th",1,"2026-05-20","244 8th Ave, New York, NY 10011",40.744798,-73.998477,20029,139.35,139.35,0,0,0),
 ("US00023","23rd & 1st",2,None,"352 E 23rd St, New York, NY 10010",40.736731,-73.978947,20030,137.0,137.0,12,1,0),
 ("US00024","15th & 3rd",1,"2025-12-14","147 3rd Ave, New York, NY 10003",40.734028,-73.986224,20031,85.9,85.9,3,1,0),
 ("US00025","221 Grand",1,"2025-12-15","221 Grand St, New York, NY 10013",40.718571,-73.995919,20032,92.9,92.9,2,1,0),
 ("US00026","211 Schermerhorn",2,None,"211 Schermerhorn St, Brooklyn, NY 11201",40.688944,-73.985381,20034,1111.0,1111.0,0,0,0),
 ("US00027","52nd & Madison",1,"2026-02-26","488 Madison Ave, New York, NY 10022",40.75891,-73.975197,20035,90.0,90.0,0,1,0),
 ("US00028","Jackson Ave - LIC",5,None,"27-01 Jackson Ave, Long Island City, NY 11101",40.748002,-73.941039,20054,1111.0,1111.0,0,0,0),
 ("US00029","148 Chambers",5,None,"148 Chambers St, New York, NY 10007",40.715636,-74.009908,20055,1111.0,1111.0,0,0,0),
 ("US00035","35th & 5th",2,None,"366 5th Avenue, New York, NY 10001",40.749116,-73.984616,20036,1111.0,1111.0,0,0,0),
]

# internal=1 — commissary/test kitchens, excluded from the retail roster but counted here so the
# profile can state how many were held out. NOTE: US99999 was re-addressed to 1375 Broadway (NYC)
# in 2026-08; two of the three internal kitchens are now in NYC. Whether either needs its own
# permit / organics treatment is an open question for QA.
INTERNAL = [
 ("US00000", "NJ Test Kitchen", "1 County Rd Unit B9, Secaucus, NJ 07094"),
 ("US99998", "Shanghai Test Kitchen", "Unit 802, 15 W 38th St, New York, NY 10018"),
 ("US99999", "NJ Test Kitchen 2", "1375 Broadway, New York, NY 10018"),
]

# Fields this script owns (recomputed from the ops extract). Everything else on a committed row —
# dohEstablishmentId, licenseNumbers, reviewed, brand, establishmentType — is preserved as-is.
OPS_DERIVED_FIELDS = [
    "storeName", "status", "openDate", "address", "city", "state", "zip", "jurisdiction",
    "floorAreaSqft", "floorAreaSource", "lat", "lng", "asOf", "source",
    "_deptId", "_seatCount", "_usageAreaSqm", "_floorAreaNote", "_hasScannedFoodLicenceImage",
]


def parse_addr(addr):
    """'<street>, <city>, <STATE> <ZIP>' -> (street, city, state, zip)."""
    parts = [p.strip() for p in addr.split(",")]
    m = re.match(r"([A-Z]{2})\s+(\d{5})", parts[-1])
    return (", ".join(parts[:-2]) if len(parts) >= 3 else parts[0],
            parts[-2] if len(parts) >= 2 else None,
            m.group(1) if m else None,
            m.group(2) if m else None)


def jurisdiction(city, state):
    if state == "NY" and city and city.lower() in NYC_BOROUGH_CITIES:
        return "New York City"
    return None  # e.g. Secaucus NJ (Hudson County) — not a jurisdiction we model


def sqm_to_sqft(v):
    return None if (v is None or v in PLACEHOLDERS) else round(v * SQM_TO_SQFT)


def derive(row):
    """Recompute the ops-derived fields for one store."""
    sno, name, status, odate, addr, lat, lng, dept, usqm, _bsqm, seats, lic, _internal = row
    street, city, state, zc = parse_addr(addr)
    sqft = sqm_to_sqft(usqm)
    placeholder = usqm in PLACEHOLDERS
    return {
        "storeName": name,
        "status": STATUS_MAP[status],
        "openDate": odate,
        "address": street, "city": city, "state": state, "zip": zc,
        "jurisdiction": jurisdiction(city, state),
        "floorAreaSqft": sqft,
        "floorAreaSource": "ops" if sqft is not None else None,
        "lat": lat, "lng": lng,
        "asOf": AS_OF, "source": SOURCE,
        "_deptId": dept,
        "_seatCount": seats,
        "_usageAreaSqm": None if placeholder else usqm,
        "_floorAreaNote": ("placeholder 1111/11111 in source -> unknown" if placeholder
                           else f"converted from {usqm} m² (ops-entered) x{SQM_TO_SQFT}"),
        "_hasScannedFoodLicenceImage": bool(lic),
    }


def new_row(sid, derived):
    """Shape for a store that is in the ops DB but not yet in the committed roster."""
    return {"storeId": sid, "brand": "Luckin Coffee",
            "establishmentType": "甲方门店 Owned Store", **derived,
            "licenseNumbers": [], "dohEstablishmentId": None, "reviewed": False}


def recompute_profile(profile, stores):
    """Recompute the aggregates in place; preserve estimatedEmployeeCount and friends."""
    known = [s for s in stores if s["floorAreaSqft"] is not None]
    n_open = sum(1 for s in stores if s["status"] == "open")
    n_planned = sum(1 for s in stores if s["status"] == "planned")
    n_closed = sum(1 for s in stores if s["status"] == "closed")
    nyc = [s for s in stores if s["jurisdiction"] == "New York City"]
    nyc_open = [s for s in nyc if s["status"] == "open"]
    nyc_known = [s for s in nyc if s["floorAreaSqft"] is not None]
    nyc_open_combined = sum(s["floorAreaSqft"] for s in nyc_open if s["floorAreaSqft"] is not None)

    profile["asOf"] = AS_OF
    profile["source"] = SOURCE
    profile["national"].update({
        "locationCount": n_open, "openLocationCount": n_open,
        "plannedLocationCount": n_planned, "closedOrWithdrawnLocationCount": n_closed,
        "retailLocationCountAllStatuses": len(stores),
        "internalKitchensExcluded": len(INTERNAL),
    })
    for j in profile.get("jurisdictions", []):
        if j.get("jurisdiction") != "New York City":
            continue
        j.update({
            "locationCount": len(nyc_open), "combinedFloorAreaSqft": nyc_open_combined,
            "_openLocationCount": len(nyc_open),
            "_plannedLocationCount": sum(1 for s in nyc if s["status"] == "planned"),
            "_closedOrWithdrawnLocationCount": sum(1 for s in nyc if s["status"] == "closed"),
            "_allStatusLocationCount": len(nyc),
            "_combinedFloorAreaSqftOpenKnown": nyc_open_combined,
            "_combinedFloorAreaSqftAllKnown": sum(s["floorAreaSqft"] for s in nyc_known),
            "_floorAreaCoverage": f"sqft known for {len(nyc_known)}/{len(nyc)} NYC retail stores",
        })
    profile["floorArea"].update({
        "perStoreTypicalSqft": round(median(s["floorAreaSqft"] for s in known)) if known else None,
        "perStoreMaxSqft": max((s["floorAreaSqft"] for s in known), default=None),
        "totalSqft": sum(s["floorAreaSqft"] for s in known) if known else None,
        "_basis": f"{len(known)} retail stores with known area",
    })
    # coverageNote embeds the counts — rewrite the numbers, keep the wording.
    note = profile.get("coverageNote") or ""
    note = re.sub(r"Floor area known for \d+/\d+ retail stores; \d+ stores carry",
                  f"Floor area known for {len(known)}/{len(stores)} retail stores; "
                  f"{len(stores) - len(known)} stores carry", note)
    note = re.sub(r"All retail stores are in New York City \(\d+ open, \d+ planned, \d+ closed/withdrawn\)",
                  f"All retail stores are in New York City ({n_open} open, {n_planned} planned, "
                  f"{n_closed} closed/withdrawn)", note)
    profile["coverageNote"] = note
    return {"open": n_open, "planned": n_planned, "closed": n_closed, "known": len(known),
            "nyc_open": len(nyc_open), "nyc_combined": nyc_open_combined,
            "max": profile["floorArea"]["perStoreMaxSqft"]}


def main():
    apply = "--apply" in sys.argv
    stores_path = os.path.join(DATA, "owned_stores.json")
    profile_path = os.path.join(DATA, "company_profile.json")
    committed = json.load(open(stores_path, encoding="utf-8"))
    by_id = {s["storeId"]: s for s in committed}
    fresh = {r[0]: derive(r) for r in ROWS}

    added = sorted(set(fresh) - set(by_id))
    dropped = sorted(set(by_id) - set(fresh))
    changes = [(sid, k, by_id[sid].get(k), v)
               for sid, d in fresh.items() if sid in by_id
               for k, v in d.items() if k != "asOf" and by_id[sid].get(k) != v]

    print(f"=== footprint diff — committed asOf {committed[0].get('asOf')} → extract {AS_OF} ===")
    if added:
        print(f"  + new in ops DB, not in roster: {added}")
    if dropped:
        print(f"  ! in roster but NOT in the extract (investigate before applying): {dropped}")
    if not changes:
        print("  (no field changes; asOf bump only)")
    cur = None
    for sid, k, old, new in changes:
        if sid != cur:
            print(f"\n  {sid}  {fresh[sid]['storeName']}")
            cur = sid
        print(f"    {k}: {old!r} → {new!r}")

    preserved = sum(1 for s in committed if s.get("dohEstablishmentId"))
    print(f"\n  preserved (not touched by this script): {preserved} CAMIS links, "
          f"licenseNumbers, reviewed flags, company_profile.estimatedEmployeeCount")

    if not apply:
        print("\n(dry-run — pass --apply to write)")
        return

    for s in committed:
        d = fresh.get(s["storeId"])
        if d:
            s.update(d)  # ops-derived fields only; everything else survives
    for sid in added:
        committed.append(new_row(sid, fresh[sid]))

    with open(stores_path, "w", encoding="utf-8") as f:
        json.dump(committed, f, indent=2, ensure_ascii=False)
        f.write("\n")

    profile = json.load(open(profile_path, encoding="utf-8"))
    agg = recompute_profile(profile, committed)
    with open(profile_path, "w", encoding="utf-8") as f:
        json.dump(profile, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"\n=== written ===")
    print(f"  owned_stores.json   : {len(committed)} retail · open={agg['open']} "
          f"planned={agg['planned']} closed={agg['closed']}")
    print(f"  company_profile.json: NYC open={agg['nyc_open']} combined={agg['nyc_combined']} sqft · "
          f"area known {agg['known']}/{len(committed)} · largest={agg['max']} sqft")
    print("\nNext: npm run prep:domains && npm run prep:validate && npm run prep:export")


if __name__ == "__main__":
    main()
