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

/** Days from today to a rule's effective date (negative = already in effect); null when undated.
 *  Lives here (pure) so client components can use it WITHOUT importing aggregate.ts → data.ts. */
export function daysToEffective(effectiveDate: string | null | undefined, todayIso: string): number | null {
  if (!effectiveDate) return null;
  return Math.round(
    (new Date(effectiveDate + "T00:00:00Z").getTime() - new Date(todayIso + "T00:00:00Z").getTime()) / 86400000,
  );
}

/** Strip the leading "NN " from a standardized-category label to get the name only. */
export function categoryName(label: string | null | undefined): string {
  if (!label) return "";
  return label.replace(/^\d+\s+/, "");
}
