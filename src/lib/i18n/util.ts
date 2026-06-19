/**
 * Pure i18n helpers usable from BOTH server and client components (no 'use client').
 */
import type { Locale } from "./messages";

/** Pick the locale-appropriate value from a bilingual pair (zh primary for QA team). */
export function pickLang(
  locale: Locale,
  zhVal: string | null | undefined,
  enVal: string | null | undefined,
): string {
  if (locale === "zh") return (zhVal ?? enVal ?? "") || "";
  return (enVal ?? zhVal ?? "") || "";
}

/** ISO 'YYYY-MM-DD' → workbook-style 'YYYY/MM/DD'. Empty string for null. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.replaceAll("-", "/");
}

/** Strip the leading "NN " from a standardized-category label to get the name only. */
export function categoryName(label: string | null | undefined): string {
  if (!label) return "";
  return label.replace(/^\d+\s+/, "");
}
