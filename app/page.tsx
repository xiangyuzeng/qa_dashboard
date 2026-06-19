/**
 * P0 placeholder home — proves build-time JSON reads work end-to-end.
 * Replaced by the full QA Overview surface in P3 (app shell + nav arrive in P2).
 */
import meta from "@/data/v2/meta.json";
import regulatory from "@/data/v2/regulatory.json";
import inspections from "@/data/v2/inspections.json";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-brandnavy">
        Luckin NA · QA Food-Safety Dashboard
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        瑞幸北美 · 食品安全质量监控仪表盘 — scaffold (P0) booting against the data contract.
      </p>

      {meta.isSeedData && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠️ EXAMPLE / SEED DATA — clearly-labeled placeholders for development. Not real
          inspection results. Replaced by the real one-time prep pull (P1).
        </div>
      )}

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { k: "Regulatory items", v: meta.counts.regulatory },
          { k: "Inspections", v: meta.counts.inspections },
          { k: "Alerts", v: meta.counts.alerts },
          { k: "Data as of", v: meta.dataAsOf },
          { k: "Period", v: meta.reportingPeriod.label },
          { k: "Schema", v: meta.schemaVersion },
        ].map((c) => (
          <div key={c.k} className="break-avoid rounded-lg border border-slate-200 bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">{c.k}</dt>
            <dd className="mt-1 text-lg font-semibold text-slate-900">{c.v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-8 text-xs text-slate-400">
        Loaded {regulatory.length} regulatory + {inspections.length} inspection records at build time.
        Next: P2 app shell + i18n, then the 8 QA surfaces.
      </p>
    </main>
  );
}
