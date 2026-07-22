"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { DataTable, type FacetCfg } from "@/src/components/table/DataTable";
import { RiskBadge, Badge, SectionCard, ExpandableText } from "@/src/components/ui";
import { HBar } from "@/src/components/charts";
import { riskLabel, BAR_DEFAULT } from "@/src/lib/colors";
import { fmtDate } from "@/src/lib/i18n/util";
import type { ImportExportRecord } from "@/src/lib/schema";

export function ImportClient({
  data,
  byAction,
}: {
  data: ImportExportRecord[];
  byAction: { action: string; count: number }[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const initialQ = useSearchParams().get("q") ?? "";

  const columns = useMemo<ColumnDef<ImportExportRecord, unknown>[]>(
    () => [
      {
        accessorKey: "category",
        header: t.import.category,
        cell: ({ row }) => <span className="text-slate-600">{row.original.category ?? "—"}</span>,
      },
      {
        id: "title",
        accessorFn: (r) => (locale === "zh" ? r.chineseTitle : r.englishTitle) ?? "",
        header: t.intelligence.titleCol,
        cell: ({ row }) => {
          const r = row.original;
          const title =
            (locale === "zh" ? r.chineseTitle : r.englishTitle) ?? r.englishTitle ?? r.chineseTitle ?? "—";
          const summary = (locale === "zh" ? r.chineseSummary : r.englishSummary) ?? "";
          // In 中文 mode, live English-only sources (Federal Register) have no chineseTitle
          // and fall back to the English original — flag that so the language switch isn't confusing.
          const fallbackToEn = locale === "zh" && !r.chineseTitle && !!r.englishTitle;
          return (
            <div className="max-w-xl">
              {r.sourceUrl ? (
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brandnavy hover:underline">
                  {title} ↗
                </a>
              ) : (
                <span className="font-medium text-slate-800">{title}</span>
              )}
              {fallbackToEn && (
                <span className="ml-1.5 align-middle" title={t.common.sourceLangEnNote}>
                  <Badge color="#92400e" bg="#fef3c7">
                    {t.common.sourceLangEn}
                  </Badge>
                </span>
              )}
              {summary && <ExpandableText text={summary} className="mt-0.5" />}
            </div>
          );
        },
      },
      {
        accessorKey: "agency",
        header: t.import.agencyCol,
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.agency ?? "—"}</span>,
      },
      { accessorKey: "countryRegion", header: t.import.country, cell: ({ row }) => row.original.countryRegion ?? "—" },
      {
        accessorKey: "productInvolved",
        header: t.import.product,
        cell: ({ row }) => {
          const p = row.original.productInvolved;
          return p ? <ExpandableText text={p} className="max-w-xs" textClass="text-xs text-slate-600" /> : <span className="text-slate-300">—</span>;
        },
      },
      { accessorKey: "publicationDate", header: t.common.date, cell: ({ row }) => fmtDate(row.original.publicationDate) || "—" },
      {
        accessorKey: "regulatoryAction",
        header: t.import.action,
        cell: ({ row }) => (row.original.regulatoryAction ? <Badge>{row.original.regulatoryAction}</Badge> : "—"),
      },
      { accessorKey: "riskLevel", header: t.common.riskLevel, cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} /> },
    ],
    [t, locale],
  );

  const facets: FacetCfg[] = useMemo(
    () => [
      { columnId: "agency", label: t.import.agencyCol },
      { columnId: "regulatoryAction", label: t.import.action },
      { columnId: "countryRegion", label: t.import.country },
      { columnId: "riskLevel", label: t.common.riskLevel, format: (v) => riskLabel(v, locale) },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.import.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.import.subtitle}</p>
      </div>
      <SectionCard title={t.import.byAction}>
        <HBar data={byAction.map((d) => ({ label: d.action, value: d.count, color: BAR_DEFAULT }))} />
      </SectionCard>
      <DataTable
        data={data}
        columns={columns}
        facets={facets}
        searchableText={(r) =>
          [r.chineseTitle, r.englishTitle, r.chineseSummary, r.englishSummary, r.agency, r.countryRegion, r.productInvolved, r.category]
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
