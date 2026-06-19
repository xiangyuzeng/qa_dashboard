"use client";

import Link from "next/link";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { SectionCard, RiskBadge, Badge } from "@/src/components/ui";
import type { ChecklistItem, TrainingItem, WatchEntity } from "@/src/lib/aggregate";

function Star() {
  return <Badge color="#0c4a6e" bg="#e0f2fe">★</Badge>;
}

export function ActionsClient({
  checklist,
  training,
  watch,
}: {
  checklist: ChecklistItem[];
  training: TrainingItem[];
  watch: WatchEntity[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const label = (zh: string, en: string) => (locale === "zh" ? zh : en);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.actions.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.actions.subtitle}</p>
      </div>

      <SectionCard title={t.actions.checklist}>
        <ol className="space-y-2">
          {checklist.map((c, i) => (
            <li key={c.id} className="break-avoid flex items-start gap-3 rounded-md border border-slate-100 p-2.5">
              <span className="mt-0.5 w-6 shrink-0 text-center text-sm font-bold text-slate-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800">{label(c.labelZh, c.labelEn)}</span>
                  {c.cafe && <Star />}
                  <span className="text-xs text-slate-400">
                    {t.actions.priority} {c.composite} · {c.frequency} {t.actions.occurrences}
                    {c.critical > 0 && <> · {c.critical} {t.actions.criticalCount}</>}
                  </span>
                </div>
                {c.note && <p className="mt-0.5 text-xs text-slate-500">{c.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title={t.actions.training}>
          <ul className="space-y-2">
            {training.map((c) => (
              <li key={c.id} className="break-avoid rounded-md border border-slate-100 p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-800">{label(c.labelZh, c.labelEn)}</span>
                  {c.cafe && <Star />}
                  <span className="ml-auto text-xs text-slate-400">
                    {c.critical} {t.actions.criticalCount} · {c.repeat}× repeat
                  </span>
                </div>
                {c.note && <p className="mt-0.5 text-xs text-slate-500">{c.note}</p>}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={`${t.actions.watchlist} · ${watch.length}`}>
          {watch.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">—</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">{t.common.riskLevel}</th>
                    <th className="px-2 py-2">{t.inspections.store}</th>
                    <th className="px-2 py-2">{t.common.brand}</th>
                    <th className="px-2 py-2">{t.common.jurisdiction}</th>
                    <th className="px-2 py-2">{t.alerts.reason}</th>
                  </tr>
                </thead>
                <tbody>
                  {watch.map((w) => (
                    <tr key={w.key} className={`border-b border-slate-100 align-top ${w.riskLevel === "高风险" ? "bg-risk-highbg/40" : ""}`}>
                      <td className="px-2 py-2"><RiskBadge risk={w.riskLevel} /></td>
                      <td className="px-2 py-2">
                        <Link href={`/inspections/${w.sampleId}`} className="font-medium text-brandnavy hover:underline">
                          {w.storeName ?? "—"}
                        </Link>
                        <span className="ml-1">
                          {w.alert && <Badge color="#fff" bg="#C00000">alert</Badge>}{" "}
                          {w.repeat && <Badge color="#fff" bg="#7C3AED">repeat</Badge>}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-600">{w.brand ?? "—"}</td>
                      <td className="px-2 py-2 text-slate-600">{w.jurisdiction ?? "—"}</td>
                      <td className="px-2 py-2 text-xs text-slate-500">{w.alertReason ?? (w.repeat ? "repeat violation" : "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
