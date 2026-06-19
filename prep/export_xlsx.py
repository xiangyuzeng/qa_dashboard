#!/usr/bin/env python3
"""
Excel export (surface 8) — fills the canonical 7-sheet template with the reviewed dataset
using openpyxl (the template's native tool → exact fidelity: dropdowns, frozen panes,
autoFilter, merged bilingual titles, and reference sheets 3–7 are all preserved).

Why Python/openpyxl: the template is openpyxl-authored and neither xlsx-populate nor
ExcelJS can parse it. openpyxl round-trips it perfectly. Output is a STATIC file the
dashboard links to (no serverless function) — run as the last step of the one-time prep.

Run: npm run prep:export   (python3 prep/export_xlsx.py)
"""
import json
import os
from copy import copy
from openpyxl import load_workbook
from openpyxl.styles import PatternFill, Font

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "v2")
TEMPLATE = os.path.join(ROOT, "templates", "monthly_report.xlsx")
OUT_DIR = os.path.join(ROOT, "public", "exports")
OUT = os.path.join(OUT_DIR, "monthly_report.xlsx")

SHEET1 = "食品安全信息月报-美国"
SHEET2 = "美国咖啡馆及重点品牌检查结果"
START_ROW = 3
MAX_ROW = 202
RED_FILL = PatternFill("solid", fgColor="F4CCCC")
RED_FONT_COLOR = "C00000"

SHEET1_COLS = ["no", "category", "chineseTitle", "englishTitle", "source", "publicationDate",
               "chineseSummary", "englishSummary", "sourceUrl", "riskLevel", "relevanceNotes",
               "recommendedAction"]
SHEET2_COLS = ["no", "jurisdiction", "regulatoryAgency", "brand", "establishmentType", "storeName",
               "address", "inspectionDate", "inspectionType", "inspectionResult", "score", "grade",
               "violationCode", "chineseViolationSummary", "englishViolationSummary",
               "violationSeverity", "standardizedCategory", "followupRequired", "sourceType",
               "riskLevel", "sourceUrlOrDocRef", "recommendedAction"]


def load(name):
    with open(os.path.join(DATA, name), encoding="utf-8") as f:
        return json.load(f)


def servable(r):
    return r.get("reviewed") and r.get("reviewStatus") != "rejected"


def fmt(key, val):
    if val is None:
        return ""
    if "date" in key.lower() and isinstance(val, str) and val:
        return val.replace("-", "/")
    return val


def fill_sheet(ws, columns, records):
    for i, rec in enumerate(records):
        row = START_ROW + i
        if row > MAX_ROW:
            break
        high = rec.get("riskLevel") == "高风险"
        for ci, key in enumerate(columns):
            cell = ws.cell(row=row, column=ci + 1)
            cell.value = (i + 1) if key == "no" else fmt(key, rec.get(key))
            if high:
                cell.fill = RED_FILL
                ex = cell.font
                cell.font = Font(name=ex.name, size=ex.size, bold=ex.bold, color=RED_FONT_COLOR)
    # clear any leftover template example rows below the data
    for row in range(START_ROW + len(records), MAX_ROW + 1):
        for ci in range(len(columns)):
            c = ws.cell(row=row, column=ci + 1)
            if c.value not in (None, ""):
                c.value = None


def set_period(ws, year, month):
    c = ws.cell(row=1, column=1)
    if isinstance(c.value, str):
        c.value = c.value.replace("____年__月", f"{year}年{month}月" if month else f"{year}年")


def main():
    reg = [r for r in load("regulatory.json") if servable(r)]
    insp = [r for r in load("inspections.json") if servable(r)]
    meta = load("meta.json")
    period = meta.get("reportingPeriod", {})

    wb = load_workbook(TEMPLATE)
    fill_sheet(wb[SHEET1], SHEET1_COLS, reg)
    fill_sheet(wb[SHEET2], SHEET2_COLS, insp)
    set_period(wb[SHEET1], period.get("year"), period.get("month"))
    set_period(wb[SHEET2], period.get("year"), period.get("month"))

    os.makedirs(OUT_DIR, exist_ok=True)
    wb.save(OUT)
    print(f"export: wrote {len(reg)} regulatory + {len(insp)} inspections → public/exports/monthly_report.xlsx")


if __name__ == "__main__":
    main()
