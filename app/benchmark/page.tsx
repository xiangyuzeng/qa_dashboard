/** Competitive Benchmarking (surface 5) — Luckin vs priority competitors. */
import { getInspections } from "@/src/lib/data";
import { brandStats, categoryByBrand, resultMixByBrand, BENCH_BRANDS } from "@/src/lib/aggregate";
import { ResultEnum } from "@/src/lib/schema";
import { BenchmarkClient } from "@/src/components/benchmark/BenchmarkClient";

export default function BenchmarkPage() {
  const insp = getInspections();
  const mix = resultMixByBrand(insp);
  const resultSeries = ResultEnum.options.filter((r) => mix.some((m) => (m[r] as number) > 0));
  return (
    <BenchmarkClient
      stats={brandStats(insp)}
      benchBrands={BENCH_BRANDS}
      categoryByBrand={categoryByBrand(insp)}
      resultMix={mix}
      resultSeries={resultSeries}
    />
  );
}
