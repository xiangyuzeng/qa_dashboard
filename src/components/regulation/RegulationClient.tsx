"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { DataTable, type FacetCfg } from "@/src/components/table/DataTable";
import { RiskBadge, Badge, SectionCard } from "@/src/components/ui";
import { ComplianceCountdownGantt } from "@/src/components/viz/ComplianceCountdownGantt";
import { riskLabel } from "@/src/lib/colors";
import { fmtDate } from "@/src/lib/i18n/util";
import type { RegulationRecord } from "@/src/lib/schema";
import type { GanttBar } from "@/src/lib/aggregate";
import type { Locale } from "@/src/lib/i18n/messages";

/** Friendly bilingual labels for the regulation status + topic enums. */
const STATUS_LABEL: Record<string, { zh: string; en: string }> = {
  Proposed: { zh: "提案中", en: "Proposed" },
  Passed: { zh: "已通过", en: "Passed" },
  "In effect": { zh: "已生效", en: "In effect" },
  "Pending effective": { zh: "待生效", en: "Pending effective" },
  Repealed: { zh: "已废止", en: "Repealed" },
  Monitoring: { zh: "持续关注", en: "Monitoring" },
};
const TOPIC_LABEL: Record<string, { zh: string; en: string }> = {
  menu_labeling: { zh: "菜单标识", en: "Menu labeling" },
  added_sugar: { zh: "添加糖", en: "Added sugar" },
  sodium: { zh: "钠 / 盐", en: "Sodium" },
  allergen_disclosure: { zh: "过敏原披露", en: "Allergen disclosure" },
  food_additives: { zh: "食品添加剂", en: "Food additives" },
  pfas_packaging: { zh: "PFAS 包装", en: "PFAS packaging" },
  delivery_platform: { zh: "外卖平台", en: "Delivery platform" },
  other: { zh: "其他", en: "Other" },
};
const statusLabel = (v: string, locale: Locale) => (locale === "zh" ? STATUS_LABEL[v]?.zh : STATUS_LABEL[v]?.en) ?? v;
const topicLabel = (v: string, locale: Locale) => (locale === "zh" ? TOPIC_LABEL[v]?.zh : TOPIC_LABEL[v]?.en) ?? v;

export function RegulationClient({
  data,
  gantt,
  domain,
}: {
  data: RegulationRecord[];
  gantt: GanttBar[];
  domain: { min: string; max: string };
}) {
  const t = useT();
  const { locale } = useLocale();
  const initialQ = useSearchParams().get("q") ?? "";

  const columns = useMemo<ColumnDef<RegulationRecord, unknown>[]>(
    () => [
      { accessorKey: "jurisdiction", header: t.common.jurisdiction, cell: ({ row }) => row.original.jurisdiction ?? "—" },
      {
        id: "title",
        accessorFn: (r) => (locale === "zh" ? r.chineseTitle : r.englishTitle) ?? "",
        header: t.intelligence.titleCol,
        cell: ({ row }) => {
          const r = row.original;
          const title =
            (locale === "zh" ? r.chineseTitle : r.englishTitle) ?? r.englishTitle ?? r.chineseTitle ?? "—";
          const summary = (locale === "zh" ? r.chineseSummary : r.englishSummary) ?? "";
          return (
            <div className="max-w-xl">
              {r.sourceUrl ? (
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brandnavy hover:underline">
                  {title} ↗
                </a>
              ) : (
                <span className="font-medium text-slate-800">{title}</span>
              )}
              {summary && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{summary}</p>}
            </div>
          );
        },
      },
      {
        accessorKey: "regulationBillName",
        header: t.regulation.billName,
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.regulationBillName ?? "—"}</span>,
      },
      {
        accessorKey: "status",
        header: t.regulation.status,
        cell: ({ row }) => (row.original.status ? <Badge>{statusLabel(row.original.status, locale)}</Badge> : "—"),
      },
      {
        accessorKey: "topic",
        header: t.regulation.topic,
        cell: ({ row }) =>
          row.original.topic ? <Badge color="#0c4a6e" bg="#e0f2fe">{topicLabel(row.original.topic, locale)}</Badge> : "—",
      },
      { accessorKey: "publicationPassageDate", header: t.regulation.published, cell: ({ row }) => fmtDate(row.original.publicationPassageDate) || "—" },
      { accessorKey: "effectiveDate", header: t.regulation.effective, cell: ({ row }) => fmtDate(row.original.effectiveDate) || "—" },
      { accessorKey: "riskLevel", header: t.common.riskLevel, cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} /> },
    ],
    [t, locale],
  );

  const facets: FacetCfg[] = useMemo(
    () => [
      { columnId: "jurisdiction", label: t.common.jurisdiction },
      { columnId: "status", label: t.regulation.status, format: (v) => statusLabel(v, locale) },
      { columnId: "topic", label: t.regulation.topic, format: (v) => topicLabel(v, locale) },
      { columnId: "riskLevel", label: t.common.riskLevel, format: (v) => riskLabel(v, locale) },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.regulation.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.regulation.subtitle}</p>
      </div>
      <SectionCard title={t.regulation.countdown}>
        <ComplianceCountdownGantt
          bars={gantt}
          domain={domain}
          todayIso="2026-06-19"
          locale={locale}
          labels={{ today: t.regulation.today, inEffect: t.regulation.inEffect, noEffectiveDate: t.regulation.noEffectiveDate }}
        />
      </SectionCard>
      <DataTable
        data={data}
        columns={columns}
        facets={facets}
        searchableText={(r) =>
          [r.chineseTitle, r.englishTitle, r.chineseSummary, r.englishSummary, r.regulationBillName, r.keyRequirements, r.coveredEntities, r.businessImpact]
            .filter(Boolean)
            .join(" ")
        }
        initialQ={initialQ}
        searchPlaceholder={t.top.search}
        resultsLabel={t.inspections.results}
      />
    </div>
  );
}
