"use client";

import { useLocale, useT } from "@/src/lib/i18n/locale";
import { KpiCard, SectionCard } from "@/src/components/ui";
import { HBar, ResultDonut, StackedBar } from "@/src/components/charts";
import { BAR_DEFAULT, CAFE_HIGHLIGHT } from "@/src/lib/colors";
import { cafeRiskLabel } from "@/src/lib/cafeRisks";
import type { CafeRiskCount, CategoryCount, Kpis } from "@/src/lib/aggregate";

export type OverviewData = {
  kpis: Kpis;
  resultDist: { name: string; value: number }[];
  byJurisdiction: Record<string, string | number>[];
  resultSeries: string[];
  topCats: CategoryCount[];
  cafeRisks: CafeRiskCount[];
};

const pct = (v: number | null) => (v == null ? "—" : `${v}%`);

export function OverviewClient({ data }: { data: OverviewData }) {
  const t = useT();
  const { locale } = useLocale();
  const k = data.kpis;

  const catItems = data.topCats.map((c) => ({
    label: locale === "zh" ? c.labelZh : c.labelEn,
    value: c.count,
    color: c.cafe ? CAFE_HIGHLIGHT : BAR_DEFAULT,
  }));
  const cafeItems = data.cafeRisks.map((c) => ({
    label: cafeRiskLabel(c.tag, locale),
    value: c.count,
    color: CAFE_HIGHLIGHT,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.overview.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.overview.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <KpiCard label={t.overview.kpiHighRisk} value={k.highRisk} accent="#C00000" />
        <KpiCard label={t.overview.kpiRecallsOurCats} value={k.recallsOurCats} />
        <KpiCard label={t.overview.kpiOurPass} value={pct(k.ourPassRate)} accent="#15803D" />
        <KpiCard label={t.overview.kpiCompPass} value={pct(k.compPassRate)} />
        <KpiCard label={t.overview.kpiAlerts} value={k.alerts} accent="#B45309" />
        <KpiCard label={t.overview.kpiFollowups} value={k.followups} />
        <KpiCard label={t.overview.kpiCafeFlags} value={k.cafeFlags} accent="#0EA5E9" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t.overview.resultMix}>
          <ResultDonut data={data.resultDist} />
        </SectionCard>
        <SectionCard title={t.overview.byJurisdiction}>
          <StackedBar data={data.byJurisdiction} series={data.resultSeries} categoryKey="jurisdiction" />
        </SectionCard>
        <SectionCard title={t.overview.topCategories}>
          <HBar data={catItems} />
        </SectionCard>
        <SectionCard title={t.overview.cafeRisks}>
          <HBar data={cafeItems} />
        </SectionCard>
      </div>
    </div>
  );
}
