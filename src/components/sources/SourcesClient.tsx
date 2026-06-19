"use client";

import { useLocale, useT } from "@/src/lib/i18n/locale";
import { SectionCard, Badge } from "@/src/components/ui";
import type { JurisdictionRef, AlertRule, SourceProvenance } from "@/src/lib/schema";

function FeasibleBadge({ v }: { v: string }) {
  const map: Record<string, string> = { yes: "#15803D", partial: "#B45309", no: "#C00000" };
  return <Badge color="#fff" bg={map[v] ?? "#64748B"}>{v}</Badge>;
}

export function SourcesClient({
  jurisdictions,
  alertRules,
  provenance,
}: {
  jurisdictions: JurisdictionRef[];
  alertRules: AlertRule[];
  provenance: SourceProvenance[];
}) {
  const t = useT();
  const { locale } = useLocale();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.sources.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.sources.subtitle}</p>
      </div>

      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>New Jersey:</strong>{" "}
        {locale === "zh"
          ? "无统一 statewide 数据库 → 按地址识别 municipality → 对应 local health department / regional health commission；优先在线查询；无在线库标注 “OPRA / Manual Request Required”；不得将数据缺失误判为“无检查”。"
          : "No statewide DB → identify municipality by address → route to the local health department / regional health commission; prefer online lookup; mark “OPRA / Manual Request Required” when none; never record missing data as “no inspection”."}
      </div>

      <SectionCard title={t.sources.title}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2">{t.common.jurisdiction}</th>
                <th className="px-2 py-2">Data source</th>
                <th className="px-2 py-2">{t.sources.access}</th>
                <th className="px-2 py-2">{t.sources.feasible}</th>
                <th className="px-2 py-2">{t.sources.staleness}</th>
                <th className="px-2 py-2">{t.sources.reverify}</th>
              </tr>
            </thead>
            <tbody>
              {jurisdictions.map((j) => (
                <tr key={j.jurisdiction} className="border-b border-slate-100 align-top">
                  <td className="px-2 py-2 font-medium text-slate-800">{j.jurisdiction}</td>
                  <td className="px-2 py-2 text-slate-600">
                    {j.dataSource}
                    {j.endpointOrUrl && (
                      <a href={j.endpointOrUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-brandnavy hover:underline">
                        ↗
                      </a>
                    )}
                    <div className="text-xs text-slate-400">{j.accessMethod}</div>
                  </td>
                  <td className="px-2 py-2 text-slate-600">{j.accessType}</td>
                  <td className="px-2 py-2"><FeasibleBadge v={j.oneTimePullFeasible} /></td>
                  <td className="px-2 py-2 text-xs text-slate-500">{j.stalenessNote ?? "—"}</td>
                  <td className="px-2 py-2">{j.reVerifyBeforeRelying ? "⚠️" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {provenance.length > 0 && (
        <SectionCard title="Collection provenance (this dataset)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">Source</th>
                  <th className="px-2 py-2">{t.sources.access}</th>
                  <th className="px-2 py-2">Records</th>
                  <th className="px-2 py-2">{t.sources.feasible}</th>
                  <th className="px-2 py-2">{t.sources.staleness}</th>
                </tr>
              </thead>
              <tbody>
                {provenance.map((p) => (
                  <tr key={p.sourceId} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-2 font-medium text-slate-800">{p.name}</td>
                    <td className="px-2 py-2 text-slate-600">{p.accessType}</td>
                    <td className="px-2 py-2">{p.recordCount}</td>
                    <td className="px-2 py-2"><FeasibleBadge v={p.oneTimePullFeasible} /></td>
                    <td className="px-2 py-2 text-xs text-slate-500">{p.stalenessNote ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <SectionCard title={`${t.alerts.byTrigger} · ${alertRules.length}`}>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {alertRules.map((r) => (
            <li key={r.id} className="break-avoid rounded-md border border-slate-100 p-2.5 text-sm">
              <span className="font-medium text-slate-800">{r.scope}</span>
              <p className="mt-0.5 text-xs text-slate-500">{locale === "zh" ? r.conditionZh : r.conditionEn}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
