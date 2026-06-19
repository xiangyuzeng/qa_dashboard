"use client";

import Link from "next/link";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { SectionCard, RiskBadge, ResultBadge, Badge } from "@/src/components/ui";
import { cafeRiskLabel } from "@/src/lib/cafeRisks";
import { fmtDate } from "@/src/lib/i18n/util";
import type { InspectionRecord, ViolationCategory } from "@/src/lib/schema";

const isUrl = (s: string | null | undefined) => !!s && /^https?:\/\//.test(s);

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="break-avoid border-b border-slate-100 py-1.5">
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children ?? "—"}</dd>
    </div>
  );
}

export function DetailClient({
  record: r,
  category,
}: {
  record: InspectionRecord;
  category: ViolationCategory | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const v = (x: string | number | null | undefined) =>
    x === null || x === undefined || x === "" ? "—" : x;

  const sourceRef = r.sourceUrlOrDocRef ?? r.provenance.sourceUrl ?? r.provenance.docRef;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/inspections" className="text-sm text-brandnavy hover:underline">
          ‹ {t.common.back}
        </Link>
        <h1 className="text-xl font-bold text-slate-900">{v(r.storeName)}</h1>
        <RiskBadge risk={r.riskLevel} />
        <ResultBadge result={r.inspectionResult} />
        {r.provenance.dataAvailability !== "available" && (
          <Badge color="#fff" bg="#B45309">
            {r.provenance.dataAvailabilityLabel ?? t.common.notPublicOnline}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title={t.detail.fields} className="lg:col-span-2">
          <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <Row label="序号 No.">{v(r.no)}</Row>
            <Row label="地区 Jurisdiction">{v(r.jurisdiction)}</Row>
            <Row label="监管机构 Regulatory Agency">{v(r.regulatoryAgency)}</Row>
            <Row label="品牌 Brand">{v(r.brand)}</Row>
            <Row label="门店类型 Establishment Type">{v(r.establishmentType)}</Row>
            <Row label="门店名称 Store Name">{v(r.storeName)}</Row>
            <Row label="地址 Address">{v(r.address)}</Row>
            <Row label="检查日期 Inspection Date">{fmtDate(r.inspectionDate) || "—"}</Row>
            <Row label="检查类型 Inspection Type">{v(r.inspectionType)}</Row>
            <Row label="检查结果 Inspection Result"><ResultBadge result={r.inspectionResult} /></Row>
            <Row label="分数 Score">{v(r.score)}</Row>
            <Row label="等级 Grade">{v(r.grade)}</Row>
            <Row label="违规代码 Violation Code">{v(r.violationCode)}</Row>
            <Row label="违规严重程度 Violation Severity">{v(r.violationSeverity)}</Row>
            <Row label="标准化违规类别 Standardized Violation Category">
              {category ? `${category.id} ${locale === "zh" ? category.zh : category.en}` : v(r.standardizedCategory)}
              {category?.note && <span className="ml-1 text-xs text-slate-400">· {category.note}</span>}
            </Row>
            <Row label="是否需复查 Follow-up Required">{v(r.followupRequired)}</Row>
          </dl>

          <div className="mt-3 space-y-2">
            <Row label="中文违规摘要 Chinese Violation Summary">{v(r.chineseViolationSummary)}</Row>
            <Row label="英文违规摘要 English Violation Summary">{v(r.englishViolationSummary)}</Row>
            <Row label="建议行动 Recommended Action">{v(r.recommendedAction)}</Row>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title={t.detail.enrichment}>
            <dl>
              <Row label="风险等级 Risk Level"><RiskBadge risk={r.riskLevel} /></Row>
              <Row label="咖啡馆风险 Café risk tags">
                {r.cafeRiskTags.length
                  ? r.cafeRiskTags.map((tag) => (
                      <span key={tag} className="mr-1 inline-block">
                        <Badge color="#0c4a6e" bg="#e0f2fe">{cafeRiskLabel(tag, locale)}</Badge>
                      </span>
                    ))
                  : "—"}
              </Row>
              <Row label="预警 Alert">
                {r.alertTriggered ? (
                  <span>
                    <Badge color="#fff" bg="#C00000">●</Badge>{" "}
                    <span className="text-xs text-slate-600">{r.alertReason ?? "—"}</span>
                    {r.alertRuleIds.length > 0 && (
                      <span className="ml-1 text-[11px] text-slate-400">[{r.alertRuleIds.join(", ")}]</span>
                    )}
                  </span>
                ) : (
                  t.common.no
                )}
              </Row>
              <Row label="重复违规组 Repeat group">{v(r.repeatViolationGroupId)}</Row>
              <Row label="复核状态 Review status">{r.reviewStatus}</Row>
            </dl>
          </SectionCard>

          <SectionCard title={t.detail.provenance}>
            <dl>
              <Row label="数据来源方式 Source Type">{v(r.sourceType)}</Row>
              <Row label={t.common.sourceRef}>
                {isUrl(sourceRef) ? (
                  <a href={sourceRef as string} target="_blank" rel="noopener noreferrer" className="break-all text-brandnavy hover:underline">
                    {sourceRef} ↗
                  </a>
                ) : (
                  v(sourceRef)
                )}
              </Row>
              <Row label="数据可得性 Data availability">
                {r.provenance.dataAvailability}
                {r.provenance.dataAvailabilityLabel && (
                  <span className="block text-xs text-amber-700">{r.provenance.dataAvailabilityLabel}</span>
                )}
              </Row>
              {r.provenance.njMunicipality && <Row label="NJ Municipality">{r.provenance.njMunicipality}</Row>}
              {r.provenance.njRoutedTo && <Row label="NJ Routed to">{r.provenance.njRoutedTo}</Row>}
              <Row label="Source ID">{r.provenance.sourceId}</Row>
              <Row label="Collected at">{v(r.provenance.collectedAt)}</Row>
            </dl>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
