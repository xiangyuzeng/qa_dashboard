"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { RiskBadge, ResultBadge, SectionCard, Badge } from "@/src/components/ui";
import { HBar, type HBarItem } from "@/src/components/charts";
import { CAFE_HIGHLIGHT, BAR_DEFAULT } from "@/src/lib/colors";
import type { AlertRow, AlertType } from "@/src/lib/alerts";

const TYPE_ACCENT: Record<AlertType, string> = {
  food_safety: "#C00000",
  import_compliance: "#B45309",
  state_local_reg: "#0891B2",
  inspection: "#1F4E79",
  applicability: "#7C3AED",
};

export function AlertsClient({
  rows,
  byType,
  byTrigger,
  byJurisdiction,
}: {
  rows: AlertRow[];
  byType: { type: AlertType; count: number }[];
  byTrigger: HBarItem[];
  byJurisdiction: HBarItem[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const [typeFilter, setTypeFilter] = useState<AlertType | null>(null);
  const shown = typeFilter ? rows.filter((r) => r.alertType === typeFilter) : rows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.alerts.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.alerts.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {byType.map((b) => {
          const active = typeFilter === b.type;
          return (
            <button
              key={b.type}
              onClick={() => setTypeFilter(active ? null : b.type)}
              className={`rounded-lg border bg-white p-4 text-left transition ${
                active ? "border-brandnavy ring-1 ring-brandnavy" : "border-slate-200 hover:bg-slate-50"
              }`}
              aria-pressed={active}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.alertType[b.type]}</div>
              <div className="mt-1 text-2xl font-bold" style={{ color: TYPE_ACCENT[b.type] }}>
                {b.count}
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t.alerts.byTrigger}>
          <HBar data={byTrigger.map((d) => ({ ...d, color: BAR_DEFAULT }))} />
        </SectionCard>
        <SectionCard title={t.alerts.byJurisdiction}>
          <HBar data={byJurisdiction.map((d) => ({ ...d, color: CAFE_HIGHLIGHT }))} />
        </SectionCard>
      </div>

      <SectionCard title={`${t.alerts.title} · ${shown.length}`}>
        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">{t.alerts.none}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-2 py-2">{t.common.riskLevel}</th>
                  <th className="px-2 py-2">{t.alerts.type}</th>
                  <th className="px-2 py-2">{t.common.jurisdiction}</th>
                  <th className="px-2 py-2">{t.common.brand}</th>
                  <th className="px-2 py-2">
                    {t.inspections.store} / {t.intelligence.titleCol}
                  </th>
                  <th className="px-2 py-2">{t.common.date}</th>
                  <th className="px-2 py-2">{t.common.result}</th>
                  <th className="px-2 py-2">{t.alerts.reason}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const title = locale === "zh" ? r.titleZh : r.titleEn;
                  const isHigh = r.riskLevel === "高风险";
                  return (
                    <tr
                      key={`${r.alertType}-${r.id}`}
                      className={`border-b border-slate-100 align-top ${isHigh ? "bg-risk-highbg/40" : ""}`}
                    >
                      <td className="px-2 py-2">
                        <RiskBadge risk={r.riskLevel} />
                      </td>
                      <td className="px-2 py-2">
                        <Badge color="#fff" bg={TYPE_ACCENT[r.alertType]}>
                          {t.alertType[r.alertType]}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{r.jurisOrSource}</td>
                      <td className="px-2 py-2 text-slate-600">{r.brand ?? "—"}</td>
                      <td className="px-2 py-2 font-medium text-slate-800">
                        {r.href ? (
                          r.external ? (
                            <a href={r.href} target="_blank" rel="noopener noreferrer" className="text-brandnavy hover:underline">
                              {title || "—"} ↗
                            </a>
                          ) : (
                            <Link href={r.href} className="text-brandnavy hover:underline">
                              {title || "—"}
                            </Link>
                          )
                        ) : (
                          title || "—"
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-500">{r.date ?? "—"}</td>
                      <td className="px-2 py-2">
                        <ResultBadge result={r.result} />
                      </td>
                      <td className="px-2 py-2 text-xs text-slate-600">{r.alertReason ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
