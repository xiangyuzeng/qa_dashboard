"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { SectionCard, ResultBadge } from "@/src/components/ui";
import { HBar, MultiLine, StackedBar } from "@/src/components/charts";
import { BAR_DEFAULT, CAFE_HIGHLIGHT } from "@/src/lib/colors";
import type { CategoryCount, RepeatGroup, AgencyEnforcement, RepeatOffender } from "@/src/lib/aggregate";

type Sev = { catId: number; labelZh: string; labelEn: string; critical: number; nonCritical: number };

export function TrendsClient({
  overTime,
  categories,
  severity,
  repeats,
  agencies,
  offenders,
}: {
  overTime: Record<string, string | number>[];
  categories: CategoryCount[];
  severity: Sev[];
  repeats: RepeatGroup[];
  agencies: AgencyEnforcement[];
  offenders: RepeatOffender[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const [cafeOnly, setCafeOnly] = useState(false);

  const agencyItems = agencies.map((a) => ({
    label: a.agency,
    value: a.count,
    color: a.high > 0 ? "#C00000" : BAR_DEFAULT,
  }));

  const catItems = categories
    .filter((c) => !cafeOnly || c.cafe)
    .map((c) => ({
      label: locale === "zh" ? c.labelZh : c.labelEn,
      value: c.count,
      color: c.cafe ? CAFE_HIGHLIGHT : BAR_DEFAULT,
    }));

  const sevData = severity.map((s) => ({
    category: locale === "zh" ? s.labelZh : s.labelEn,
    Critical: s.critical,
    "Non-critical": s.nonCritical,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.trends.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.trends.subtitle}</p>
      </div>

      <SectionCard title={t.trends.overTime}>
        <MultiLine
          data={overTime}
          xKey="period"
          series={[
            { key: "inspections", color: "#1F4E79", name: locale === "zh" ? "检查数" : "Inspections" },
            { key: "highRisk", color: "#C00000", name: locale === "zh" ? "高风险" : "High-risk" },
            { key: "fail", color: "#EA580C", name: locale === "zh" ? "不合格" : "Fail" },
          ]}
        />
      </SectionCard>

      {agencies.length > 0 && (
        <SectionCard title={`${t.trends.byAgency} · ${agencies.length}`}>
          <HBar data={agencyItems} />
          <p className="mt-1 text-xs text-slate-400">{t.trends.byAgencyNote}</p>
        </SectionCard>
      )}

      <SectionCard title={`${t.trends.repeatOffenders} · ${offenders.length}`}>
        {offenders.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">{t.inspections.store}</th>
                  <th className="px-2 py-2">{t.common.brand}</th>
                  <th className="px-2 py-2">{t.common.jurisdiction}</th>
                  <th className="px-2 py-2 text-right">{t.trends.records}</th>
                  <th className="px-2 py-2 text-right">{t.risk.高风险}</th>
                  <th className="px-2 py-2">{t.compliance.agency}</th>
                  <th className="px-2 py-2">{t.trends.lastSeen}</th>
                </tr>
              </thead>
              <tbody>
                {offenders.slice(0, 20).map((o, i) => (
                  <tr key={o.key} className={`border-b border-slate-100 align-top ${o.high > 0 ? "bg-risk-highbg/40" : ""}`}>
                    <td className="px-2 py-2 tabular-nums text-slate-400">{i + 1}</td>
                    <td className="px-2 py-2 font-medium text-slate-800">
                      <Link href={`/inspections/${o.members[0].id}`} className="text-brandnavy hover:underline">
                        {o.storeName ?? o.establishmentId ?? "—"}
                      </Link>
                      {o.address && <div className="text-xs font-normal text-slate-400">{o.address}</div>}
                    </td>
                    <td className="px-2 py-2 text-slate-600">{o.brand ?? "—"}</td>
                    <td className="px-2 py-2 text-slate-600">{o.jurisdiction ?? "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums font-semibold">{o.count}</td>
                    <td className="px-2 py-2 text-right tabular-nums">
                      {o.high > 0 ? <span className="rounded-full bg-risk-high px-2 py-0.5 text-xs font-bold text-white">{o.high}</span> : "—"}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500">
                      {o.agencies.length > 1 ? `${o.agencies.length} ${t.trends.agenciesLabel}` : o.agencies[0] ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-500">{o.lastDate ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={t.trends.categoryFreq}
          right={
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input type="checkbox" checked={cafeOnly} onChange={(e) => setCafeOnly(e.target.checked)} />
              {t.trends.cafeOnly}
            </label>
          }
        >
          <HBar data={catItems} />
        </SectionCard>

        <SectionCard title={t.trends.severitySplit}>
          <StackedBar
            data={sevData}
            series={["Critical", "Non-critical"]}
            categoryKey="category"
            colors={{ Critical: "#C00000", "Non-critical": "#94A3B8" }}
          />
        </SectionCard>
      </div>

      <SectionCard title={t.trends.repeat}>
        {repeats.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">—</p>
        ) : (
          <div className="space-y-3">
            {repeats.map((g) => (
              <div key={g.groupId} className="break-avoid rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{g.brand ?? "—"}</span>
                  <span className="text-slate-500">· {g.jurisdiction ?? "—"}</span>
                  <span className="text-slate-500">
                    · {t.common.stdCategory} {g.categoryId ?? "—"}
                  </span>
                  <span className="ml-auto rounded-full bg-risk-high px-2 py-0.5 text-xs font-bold text-white">
                    ×{g.count}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {g.members.map((m) => (
                    <li key={m.id} className="flex items-center gap-2">
                      <Link href={`/inspections/${m.id}`} className="text-brandnavy hover:underline">
                        {m.storeName ?? m.id}
                      </Link>
                      <span className="text-slate-400">{m.date ?? "—"}</span>
                      <ResultBadge result={m.result} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
