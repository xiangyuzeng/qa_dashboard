"use client";

import { useMemo, useState } from "react";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { SectionCard, Modal, RiskBadge } from "@/src/components/ui";
import { GroupedBar, HBar, StackedBar } from "@/src/components/charts";
import { BRAND_COLORS } from "@/src/lib/colors";
import { drillRows, type BrandStat, type DrillMetric } from "@/src/lib/aggregate";
import type { InspectionRecord } from "@/src/lib/schema";
import { fmtDate } from "@/src/lib/i18n/util";

const pct = (v: number | null) => (v == null ? "—" : `${v}%`);

export function BenchmarkClient({
  stats,
  benchBrands,
  categoryByBrand,
  resultMix,
  resultSeries,
  enforcement,
  enforcementSeries,
  inspections,
}: {
  stats: BrandStat[];
  benchBrands: string[];
  categoryByBrand: Record<string, string | number>[];
  resultMix: Record<string, string | number>[];
  resultSeries: string[];
  enforcement: Record<string, string | number>[];
  enforcementSeries: string[];
  inspections: InspectionRecord[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const [metric, setMetric] = useState<"failRate" | "avgScore">("failRate");
  const [drill, setDrill] = useState<{ brand: string; metric: DrillMetric } | null>(null);

  // Human label for each drillable metric, reusing existing i18n keys.
  const metricLabel: Record<DrillMetric, string> = {
    records: t.benchmark.records,
    passRate: t.benchmark.passRate,
    failRate: t.benchmark.failRate,
    avgScore: t.benchmark.avgScore,
    highRisk: t.overview.kpiHighRisk,
    critical: t.common.critical,
    enforcement: t.benchmark.enforcement,
  };
  const drillList = drill ? drillRows(inspections, drill.brand, drill.metric) : [];

  // Render a table number as a drill button when it has underlying rows; plain text otherwise.
  const drillCell = (brand: string, m: DrillMetric, display: React.ReactNode) => {
    const n = drillRows(inspections, brand, m).length;
    if (n === 0) return <span>{display}</span>;
    return (
      <button
        type="button"
        onClick={() => setDrill({ brand, metric: m })}
        title={t.benchmark.drill.showing.replace("{n}", String(n))}
        className="cursor-pointer text-brandnavy underline decoration-dotted underline-offset-2 hover:decoration-solid"
      >
        {display}
      </button>
    );
  };

  // Localize the agency-category series keys for the enforcement stacked bar.
  const enfCats = t.benchmark.enfCats as Record<string, string>;
  const enfData = useMemo(
    () =>
      enforcement.map((r) => {
        const row: Record<string, string | number> = { brand: r.brand as string };
        for (const c of enforcementSeries) row[enfCats[c] ?? c] = (r[c] as number) ?? 0;
        return row;
      }),
    [enforcement, enforcementSeries, enfCats],
  );
  const enfLocalSeries = enforcementSeries.map((c) => enfCats[c] ?? c);

  const metricBars = stats
    .filter((s) => (metric === "failRate" ? s.failRate : s.avgScore) != null)
    .map((s) => ({
      label: s.brand,
      value: (metric === "failRate" ? s.failRate : s.avgScore) as number,
      color: BRAND_COLORS[s.brand] ?? "#1F4E79",
    }));

  const catData = useMemo(
    () =>
      categoryByBrand.map((r) => {
        const row: Record<string, string | number> = {
          category: (locale === "zh" ? r.labelZh : r.labelEn) as string,
        };
        for (const b of benchBrands) row[b] = (r[b] as number) ?? 0;
        return row;
      }),
    [categoryByBrand, benchBrands, locale],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.benchmark.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.benchmark.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={t.benchmark.byBrand}
          right={
            <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs">
              <button
                onClick={() => setMetric("failRate")}
                className={`px-2 py-1 ${metric === "failRate" ? "bg-brandnavy text-white" : "bg-white text-slate-600"}`}
              >
                {t.benchmark.failRate}
              </button>
              <button
                onClick={() => setMetric("avgScore")}
                className={`px-2 py-1 ${metric === "avgScore" ? "bg-brandnavy text-white" : "bg-white text-slate-600"}`}
              >
                {t.benchmark.avgScore}
              </button>
            </div>
          }
        >
          <HBar data={metricBars} />
          {metric === "avgScore" && (
            <p className="mt-2 text-xs text-slate-400">
              ⚠️ Scores are jurisdiction-relative (NYC high = worse; LA &lt;80 = worse) — compare within a jurisdiction.
            </p>
          )}
        </SectionCard>

        <SectionCard title={t.benchmark.resultMix}>
          <StackedBar data={resultMix} series={resultSeries} categoryKey="brand" />
        </SectionCard>
      </div>

      <SectionCard title={t.benchmark.categoryByBrand}>
        <GroupedBar
          data={catData}
          series={benchBrands.map((b) => ({ key: b, color: BRAND_COLORS[b] }))}
          categoryKey="category"
        />
      </SectionCard>

      {enfData.length > 0 && (
        <SectionCard title={t.benchmark.enforcementTitle}>
          <StackedBar data={enfData} series={enfLocalSeries} categoryKey="brand" />
          <p className="mt-2 text-xs text-slate-400">{t.benchmark.enfNote}</p>
        </SectionCard>
      )}

      <SectionCard title={t.benchmark.byBrand}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">{t.common.brand}</th>
                <th className="px-2 py-2">{t.benchmark.records}</th>
                <th className="px-2 py-2">{t.benchmark.passRate}</th>
                <th className="px-2 py-2">{t.benchmark.failRate}</th>
                <th className="px-2 py-2">{t.benchmark.avgScore}</th>
                <th className="px-2 py-2">{t.overview.kpiHighRisk}</th>
                <th className="px-2 py-2">{t.common.critical}</th>
                <th className="px-2 py-2">{t.benchmark.enforcement}</th>
              </tr>
            </thead>
            <tbody>
              {stats
                .filter((s) => s.records > 0)
                .map((s) => {
                  const isLuckin = s.brand === "Luckin Coffee";
                  return (
                    <tr key={s.brand} className={`border-b border-slate-100 ${isLuckin ? "bg-brandnavy/5 font-semibold" : ""}`}>
                      <td className="px-2 py-2" style={{ color: BRAND_COLORS[s.brand] }}>{s.brand}</td>
                      <td className="px-2 py-2">{drillCell(s.brand, "records", s.records)}</td>
                      <td className="px-2 py-2">{drillCell(s.brand, "passRate", pct(s.passRate))}</td>
                      <td className="px-2 py-2">{drillCell(s.brand, "failRate", pct(s.failRate))}</td>
                      <td className="px-2 py-2">{drillCell(s.brand, "avgScore", s.avgScore ?? "—")}</td>
                      <td className="px-2 py-2">{drillCell(s.brand, "highRisk", s.highRisk)}</td>
                      <td className="px-2 py-2">{drillCell(s.brand, "critical", s.critical)}</td>
                      <td className="px-2 py-2">{drillCell(s.brand, "enforcement", s.enforcement || "—")}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">{t.benchmark.drill.hint}</p>
      </SectionCard>

      <Modal
        open={drill != null}
        onClose={() => setDrill(null)}
        title={drill ? `${drill.brand} · ${metricLabel[drill.metric]}` : ""}
        subtitle={t.benchmark.drill.showing.replace("{n}", String(drillList.length))}
      >
        {drillList.length === 0 ? (
          <p className="text-sm text-slate-500">{t.benchmark.drill.none}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">{t.inspections.store}</th>
                  <th className="px-2 py-2">{t.common.jurisdiction}</th>
                  <th className="px-2 py-2">{t.common.date}</th>
                  <th className="px-2 py-2">{t.benchmark.drill.result}</th>
                  <th className="px-2 py-2">{t.benchmark.drill.score}</th>
                  <th className="px-2 py-2">{t.common.riskLevel}</th>
                  <th className="px-2 py-2">{t.benchmark.drill.source}</th>
                </tr>
              </thead>
              <tbody>
                {drillList.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-2">{r.storeName ?? "—"}</td>
                    <td className="px-2 py-2 text-xs text-slate-500">{r.jurisdiction ?? "—"}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{fmtDate(r.inspectionDate) || "—"}</td>
                    <td className="px-2 py-2">{r.inspectionResult ?? "—"}</td>
                    <td className="px-2 py-2">{typeof r.score === "number" ? r.score : "—"}</td>
                    <td className="px-2 py-2"><RiskBadge risk={r.riskLevel} /></td>
                    <td className="px-2 py-2">
                      {r.provenance?.sourceUrl ? (
                        <a href={r.provenance.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-brandnavy hover:underline">
                          {r.provenance.sourceId ?? "link"} ↗
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">{r.provenance?.sourceId ?? "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
