/**
 * QA Overview (surface 1) — server component computes aggregates from the data seam
 * and hands plain arrays to the client presentation (localized labels + charts).
 */
import { getInspections, getRegulatory } from "@/src/lib/data";
import {
  computeKpis,
  resultDistribution,
  resultByJurisdiction,
  topCategories,
  cafeRiskBreakdown,
} from "@/src/lib/aggregate";
import { ResultEnum } from "@/src/lib/schema";
import { OverviewClient, type OverviewData } from "@/src/components/overview/OverviewClient";

export default function Home() {
  const insp = getInspections();
  const reg = getRegulatory();
  const resultDist = resultDistribution(insp);

  const data: OverviewData = {
    kpis: computeKpis(insp, reg),
    resultDist,
    byJurisdiction: resultByJurisdiction(insp),
    resultSeries: ResultEnum.options.filter((r) => resultDist.some((d) => d.name === r)),
    topCats: topCategories(insp, 8),
    cafeRisks: cafeRiskBreakdown(insp),
  };

  return <OverviewClient data={data} />;
}
