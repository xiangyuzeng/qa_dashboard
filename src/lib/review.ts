/**
 * Manual-review gate (spec §10) — the worklist of records that warrant human sign-off
 * before they are trusted to drive action/alerts. Two layers:
 *   1. Hard gate (prep/review_gate.ts): a maintainer can move flagged records to
 *      reviewStatus:"pending" — those leave every servable view (data.ts isServable) and
 *      surface here via getPendingRecords(). Run deliberately ("flip it on").
 *   2. Soft worklist (this module): criteria-driven flags over the PUBLISHED data so QA
 *      always has a queue of high-stakes items to spot-check, even with the hard gate off.
 *
 * Pure + dependency-free (no data import) so client components can use it.
 */
import type { InspectionRecord } from "./schema";

export type ReviewReason =
  | "awaitingSignoff" // already reviewStatus:"pending" (hard gate)
  | "enforcementAction" // closure / permit suspension / stop sale
  | "ownedStoreAdverse" // our own store with an adverse finding
  | "competitorEnforcement"; // live brand-matched enforcement (verify the match is genuine)

export type ReviewItem = {
  id: string;
  module: string;
  titleZh: string | null;
  titleEn: string | null;
  riskLevel: string | null;
  jurisdiction: string | null;
  agency: string | null;
  brand: string | null;
  date: string | null;
  reason: ReviewReason;
  reasonDetailZh: string;
  reasonDetailEn: string;
  href: string | null;
  /** lower = more urgent (sorted first). */
  priority: number;
};

const SEVERE = new Set(["Closed", "Permit Suspended", "Stop Sale"]);

const REASON_TEXT: Record<ReviewReason, { zh: string; en: string }> = {
  awaitingSignoff: { zh: "已置为待审核（硬门控）——批准后方可发布。", en: "Held as pending (hard gate) — publish only after approval." },
  enforcementAction: { zh: "停业 / 吊销 / 停售等强制处置——发布前须人工核实。", en: "Closure / suspension / stop-sale enforcement — verify before publishing." },
  ownedStoreAdverse: { zh: "我方门店出现不利检查结果——须核实 CAMIS 匹配与结果后再驱动整改。", en: "Our own store has an adverse result — verify the CAMIS match + outcome before it drives remediation." },
  competitorEnforcement: { zh: "实时品牌匹配的竞品执法记录——须确认品牌匹配真实（非同名地址/实体）。", en: "Live brand-matched competitor enforcement — confirm the brand match is genuine (not a same-name street/entity)." },
};

/** Soft worklist over PUBLISHED inspection records (high-stakes spot-check). */
export function buildReviewQueue(insp: InspectionRecord[]): ReviewItem[] {
  const items: ReviewItem[] = [];
  for (const r of insp) {
    let reason: ReviewReason | null = null;
    let priority = 3;
    if (r.inspectionResult && SEVERE.has(r.inspectionResult)) {
      reason = "enforcementAction";
      priority = 1;
    } else if (
      (r.establishmentType ?? "").includes("甲方门店") &&
      (r.riskLevel === "高风险" || r.inspectionResult === "Fail" || r.inspectionResult === "Closed")
    ) {
      reason = "ownedStoreAdverse";
      priority = 1;
    } else if (r.provenance?.sourceId === "nyc_oath" && r.riskLevel === "高风险") {
      reason = "competitorEnforcement";
      priority = 2;
    }
    if (!reason) continue;
    items.push({
      id: r.id,
      module: "inspection",
      titleZh: r.storeName,
      titleEn: r.storeName,
      riskLevel: r.riskLevel,
      jurisdiction: r.jurisdiction,
      agency: r.regulatoryAgency,
      brand: r.brand,
      date: r.inspectionDate,
      reason,
      reasonDetailZh: REASON_TEXT[reason].zh,
      reasonDetailEn: REASON_TEXT[reason].en,
      href: `/inspections/${r.id}`,
      priority,
    });
  }
  return sortQueue(items);
}

export function reasonText(reason: ReviewReason): { zh: string; en: string } {
  return REASON_TEXT[reason];
}

const RISK_RANK: Record<string, number> = { 高风险: 0, 中风险: 1, 低风险: 2, 关注: 3, 信息参考: 4 };

export function sortQueue(items: ReviewItem[]): ReviewItem[] {
  return [...items].sort(
    (a, b) =>
      a.priority - b.priority ||
      (RISK_RANK[a.riskLevel ?? ""] ?? 9) - (RISK_RANK[b.riskLevel ?? ""] ?? 9) ||
      (b.date ?? "").localeCompare(a.date ?? ""),
  );
}
