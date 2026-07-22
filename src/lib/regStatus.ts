/**
 * Shared bilingual labels + track colors for the regulation lifecycle status (RegStatusEnum).
 * Single source of truth for RegulationClient (module 3) and ComplianceClient (labor/building/
 * environment/consumer) so the two never drift. Colors group the stages by lifecycle phase so a
 * reader can tell "introduced / proposed" (pre-enactment) from "in effect" at a glance — the whole
 * point: never let an early stage read as already-law.
 */
import type { RegStatus } from "@/src/lib/schema";

export const REG_STATUS_LABEL: Record<string, { zh: string; en: string }> = {
  Introduced: { zh: "议案提出", en: "Introduced" },
  Passed: { zh: "议会通过", en: "Passed" },
  Signed: { zh: "已签署成法", en: "Signed into law" },
  Proposed: { zh: "提案中", en: "Proposed" },
  "Proposed rule": { zh: "拟议规则", en: "Proposed rule" },
  "Adopted rule": { zh: "规则采纳", en: "Adopted rule" },
  "Pending effective": { zh: "待生效", en: "Pending effective" },
  "In effect": { zh: "已生效", en: "In effect" },
  Guidance: { zh: "指南 / 执法", en: "Guidance" },
  Repealed: { zh: "已废止", en: "Repealed" },
  Monitoring: { zh: "持续关注", en: "Monitoring" },
};

/** Badge color/bg per stage. Pre-enactment = amber/blue; enacted-not-yet-effective = violet;
 *  in effect = green; guidance = teal; terminal = grey. */
export const REG_STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  Introduced: { color: "#92400e", bg: "#fef3c7" },
  Passed: { color: "#b45309", bg: "#fed7aa" },
  Signed: { color: "#5b21b6", bg: "#ede9fe" },
  Proposed: { color: "#1e40af", bg: "#dbeafe" },
  "Proposed rule": { color: "#3730a3", bg: "#e0e7ff" },
  "Adopted rule": { color: "#5b21b6", bg: "#ede9fe" },
  "Pending effective": { color: "#9a3412", bg: "#ffedd5" },
  "In effect": { color: "#166534", bg: "#dcfce7" },
  Guidance: { color: "#0f766e", bg: "#ccfbf1" },
  Repealed: { color: "#475569", bg: "#e2e8f0" },
  Monitoring: { color: "#64748b", bg: "#f1f5f9" },
};

export const regStatusLabel = (v: string, locale: string): string =>
  (locale === "zh" ? REG_STATUS_LABEL[v]?.zh : REG_STATUS_LABEL[v]?.en) ?? v;

export const regStatusStyle = (v: string | null | undefined) =>
  (v && REG_STATUS_STYLE[v]) || undefined;

export type { RegStatus };
