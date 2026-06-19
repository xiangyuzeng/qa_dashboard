/**
 * Home — Monthly Summary / Exec Brief (server-computed) above the QA Overview detail.
 * The summary is the executive lede (meta.summary + KPI strip + RiskHeatmap); the
 * existing 7-KPI/4-chart OverviewClient remains below as the analyst detail.
 */
import {
  getInspections,
  getRegulatory,
  getImportExport,
  getRegulations,
  getSentiment,
  getMeta,
} from "@/src/lib/data";
import {
  computeKpis,
  resultDistribution,
  resultByJurisdiction,
  topCategories,
  cafeRiskBreakdown,
  riskHeatmap,
} from "@/src/lib/aggregate";
import { ResultEnum } from "@/src/lib/schema";
import { OverviewClient, type OverviewData } from "@/src/components/overview/OverviewClient";
import { SummaryClient } from "@/src/components/overview/SummaryClient";

export default function Home() {
  const insp = getInspections();
  const reg = getRegulatory();
  const imp = getImportExport();
  const regs = getRegulations();
  const sent = getSentiment();
  const meta = getMeta();
  const resultDist = resultDistribution(insp);

  const data: OverviewData = {
    kpis: computeKpis(insp, reg),
    resultDist,
    byJurisdiction: resultByJurisdiction(insp),
    resultSeries: ResultEnum.options.filter((r) => resultDist.some((d) => d.name === r)),
    topCats: topCategories(insp, 8),
    cafeRisks: cafeRiskBreakdown(insp),
  };

  const heat = riskHeatmap({ food: reg, imp, reg: regs, insp, sent });

  return (
    <div className="space-y-8">
      <SummaryClient summary={meta.summary} counts={meta.counts} heat={heat} />
      <OverviewClient data={data} />
    </div>
  );
}
