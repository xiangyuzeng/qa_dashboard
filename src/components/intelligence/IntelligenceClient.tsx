"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { DataTable, type FacetCfg } from "@/src/components/table/DataTable";
import { RiskBadge, Badge } from "@/src/components/ui";
import { riskLabel } from "@/src/lib/colors";
import { fmtDate } from "@/src/lib/i18n/util";
import type { RegulatoryRecord } from "@/src/lib/schema";

export function IntelligenceClient({
  data,
}: {
  data: RegulatoryRecord[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const initialQ = useSearchParams().get("q") ?? "";

  const columns = useMemo<ColumnDef<RegulatoryRecord, unknown>[]>(
    () => [
      { accessorKey: "category", header: t.common.category, cell: ({ row }) => <span className="text-slate-600">{row.original.category ?? "—"}</span> },
      {
        id: "title",
        accessorFn: (r) => (locale === "zh" ? r.chineseTitle : r.englishTitle) ?? "",
        header: t.intelligence.titleCol,
        cell: ({ row }) => {
          const r = row.original;
          const title = (locale === "zh" ? r.chineseTitle : r.englishTitle) ?? r.englishTitle ?? r.chineseTitle ?? "—";
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
              {r.relevanceTags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.relevanceTags.map((tag) => (
                    <Badge key={tag} color="#0c4a6e" bg="#e0f2fe">{tag}</Badge>
                  ))}
                </div>
              )}
            </div>
          );
        },
      },
      { accessorKey: "source", header: t.common.sourceType, cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.source ?? "—"}</span> },
      { accessorKey: "publicationDate", header: t.common.date, cell: ({ row }) => fmtDate(row.original.publicationDate) || "—" },
      { accessorKey: "riskLevel", header: t.common.riskLevel, cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} /> },
    ],
    [t, locale],
  );

  const facets: FacetCfg[] = useMemo(
    () => [
      { columnId: "category", label: t.common.category },
      { columnId: "source", label: t.common.sourceType },
      { columnId: "riskLevel", label: t.common.riskLevel, format: (v) => riskLabel(v, locale) },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.intelligence.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.intelligence.subtitle}</p>
      </div>
      <DataTable
        data={data}
        columns={columns}
        facets={facets}
        searchableText={(r) =>
          [r.chineseTitle, r.englishTitle, r.chineseSummary, r.englishSummary, r.source, r.relevanceNotes]
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
