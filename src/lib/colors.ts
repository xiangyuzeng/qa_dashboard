/** Shared palette so charts, badges, and the Excel red-row style stay visually aligned. */
import type { Locale } from "./i18n/messages";

export const RISK_COLORS: Record<string, string> = {
  高风险: "#C00000",
  中风险: "#B45309",
  低风险: "#15803D",
  信息参考: "#64748B",
};

export const RESULT_COLORS: Record<string, string> = {
  Pass: "#16A34A",
  "Conditional Pass": "#CA8A04",
  Fail: "#DC2626",
  Closed: "#991B1B",
  "Permit Suspended": "#7C3AED",
  "Stop Sale": "#EA580C",
  "Re-inspection Required": "#2563EB",
  "N/A": "#94A3B8",
};

/** Distinct accent for the café-high-frequency categories (#17 ice machine, #18 milk/dairy). */
export const CAFE_HIGHLIGHT = "#0EA5E9";
export const BAR_DEFAULT = "#1F4E79";

export const RISK_LABEL: Record<string, { zh: string; en: string }> = {
  高风险: { zh: "高风险", en: "High" },
  中风险: { zh: "中风险", en: "Medium" },
  低风险: { zh: "低风险", en: "Low" },
  信息参考: { zh: "信息参考", en: "Info" },
};

export const riskLabel = (risk: string, locale: Locale) =>
  locale === "zh" ? (RISK_LABEL[risk]?.zh ?? risk) : (RISK_LABEL[risk]?.en ?? risk);

/** Brand accent colors for benchmarking (Luckin = brand navy, emphasized). */
export const BRAND_COLORS: Record<string, string> = {
  "Luckin Coffee": "#1F4E79",
  Starbucks: "#00704A",
  Dunkin: "#FF6E0C",
  "Pret A Manger": "#7A1F2B",
  "Blue Bottle Coffee": "#1E66F5",
  "McDonald's": "#DA291C",
  "其他 Other": "#94A3B8",
};
