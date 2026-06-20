"use client";

/**
 * Monthly Summary / Exec Brief (Overview lede) — renders meta.summary + a 5-tile KPI
 * strip + the RiskHeatmap centerpiece. Sits above the existing OverviewClient on the
 * home page (executive summary → analyst detail). Null-guards meta.summary.
 */
import Link from "next/link";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { KpiCard, SectionCard, RiskBadge } from "@/src/components/ui";
import { RiskHeatmap } from "@/src/components/viz/RiskHeatmap";
import { PostureStrip, type PostureItem } from "@/src/components/overview/PostureStrip";
import { riskLabel } from "@/src/lib/colors";
import { pickLang } from "@/src/lib/i18n/util";
import { RISK_LEVELS_ORDER, type HeatRow } from "@/src/lib/aggregate";
import type { Meta, SummaryMeta } from "@/src/lib/schema";

export function SummaryClient({
  summary,
  counts,
  heat,
  posture = [],
}: {
  summary: SummaryMeta | null;
  counts: Meta["counts"];
  heat: HeatRow[];
  posture?: PostureItem[];
}) {
  const t = useT();
  const { locale } = useLocale();

  const title = summary ? pickLang(locale, summary.reportNameZh, summary.reportNameEn) : t.overview.title;
  const scope = summary ? pickLang(locale, summary.scopeZh, summary.scopeEn) : "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {scope && <p className="mt-0.5 text-sm text-slate-500">{scope}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <KpiCard label={t.summary.kpiMain} value={counts.regulatory} />
        <KpiCard label={t.summary.kpiImport} value={counts.importExport} />
        <KpiCard label={t.summary.kpiRegs} value={counts.regulation} />
        <KpiCard label={t.summary.kpiInspections} value={counts.inspections} />
        <KpiCard label={t.summary.kpiHighRisk} value={counts.highRisk} accent="#C00000" />
      </div>

      {posture.length > 0 && (
        <SectionCard title={t.summary.posture}>
          <PostureStrip posture={posture} />
        </SectionCard>
      )}

      <SectionCard title={t.summary.heatmap}>
        <RiskHeatmap
          rows={heat}
          riskLevels={RISK_LEVELS_ORDER}
          moduleLabel={(m) => t.modules[m as keyof typeof t.modules] ?? m}
          riskLabel={(r) => riskLabel(r, locale)}
        />
      </SectionCard>

      {summary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {summary.keyHighlights.length > 0 && (
            <SectionCard title={t.summary.highlights}>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {summary.keyHighlights.map((h, i) => (
                  <li key={i}>{pickLang(locale, h.zh, h.en)}</li>
                ))}
              </ul>
            </SectionCard>
          )}
          {summary.highRiskItems.length > 0 && (
            <SectionCard title={t.summary.highRiskItems}>
              <ul className="space-y-1.5 text-sm">
                {summary.highRiskItems.map((it) => {
                  const itTitle = pickLang(locale, it.titleZh, it.titleEn) || it.recordId;
                  return (
                    <li key={it.recordId} className="flex items-start gap-2">
                      <RiskBadge risk={it.riskLevel} />
                      {it.href ? (
                        <Link href={it.href} className="text-brandnavy hover:underline">
                          {itTitle}
                        </Link>
                      ) : (
                        <span className="text-slate-700">{itTitle}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SectionCard>
          )}
          {summary.keyActions.length > 0 && (
            <SectionCard title={t.summary.keyActions}>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {summary.keyActions.map((a, i) => (
                  <li key={i}>{pickLang(locale, a.zh, a.en)}</li>
                ))}
              </ul>
            </SectionCard>
          )}
          {summary.exclusions.length > 0 && (
            <SectionCard title={t.summary.exclusions}>
              <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
                {summary.exclusions.map((e, i) => (
                  <li key={i}>{pickLang(locale, e.zh, e.en)}</li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
