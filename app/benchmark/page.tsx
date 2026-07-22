/** Competitive Benchmarking (surface 5) — Luckin vs priority competitors. */
import { getInspections } from "@/src/lib/data";
import {
  brandStats,
  categoryByBrand,
  resultMixByBrand,
  enforcementByBrand,
  ENFORCEMENT_CATEGORIES,
  BENCH_BRANDS,
} from "@/src/lib/aggregate";
import { ResultEnum } from "@/src/lib/schema";
import { BenchmarkClient } from "@/src/components/benchmark/BenchmarkClient";

export default function BenchmarkPage() {
  const insp = getInspections();
  const mix = resultMixByBrand(insp);
  const resultSeries = ResultEnum.options.filter((r) => mix.some((m) => (m[r] as number) > 0));
  const enforcement = enforcementByBrand(insp);
  const enforcementSeries = ENFORCEMENT_CATEGORIES.filter((c) => enforcement.some((e) => (e[c] as number) > 0));
  // Slim the rows shipped to the client for drill-down: the modal never shows the (long) violation
  // summaries, so drop them to keep the /benchmark payload small. Predicates don't use them either.
  const drillInsp = insp.map((r) => ({ ...r, chineseViolationSummary: null, englishViolationSummary: null }));
  return (
    <BenchmarkClient
      stats={brandStats(insp)}
      benchBrands={BENCH_BRANDS}
      categoryByBrand={categoryByBrand(insp)}
      resultMix={mix}
      resultSeries={resultSeries}
      enforcement={enforcement}
      enforcementSeries={[...enforcementSeries]}
      inspections={drillInsp}
    />
  );
}
