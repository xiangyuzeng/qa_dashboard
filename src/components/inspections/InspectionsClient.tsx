"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { DataTable, type FacetCfg } from "@/src/components/table/DataTable";
import { RiskBadge, ResultBadge, Badge } from "@/src/components/ui";
import { riskLabel } from "@/src/lib/colors";
import type { InspectionRecord } from "@/src/lib/schema";

type CatRef = { id: number; zh: string; en: string };

export function InspectionsClient({
  data,
  categories,
}: {
  data: InspectionRecord[];
  categories: CatRef[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const initialQ = useSearchParams().get("q") ?? "";

  const catMap = useMemo(() => {
    const m: Record<number, string> = {};
    for (const c of categories) m[c.id] = `${c.id} ${locale === "zh" ? c.zh : c.en}`;
    return m;
  }, [categories, locale]);

  const columns = useMemo<ColumnDef<InspectionRecord, unknown>[]>(
    () => [
      { accessorKey: "jurisdiction", header: t.common.jurisdiction, cell: ({ row }) => row.original.jurisdiction ?? "—" },
      { accessorKey: "brand", header: t.common.brand, cell: ({ row }) => row.original.brand ?? "—" },
      {
        accessorKey: "establishmentType",
        header: t.common.establishmentType,
        cell: ({ row }) => <span className="text-slate-500">{row.original.establishmentType ?? "—"}</span>,
      },
      {
        accessorKey: "storeName",
        header: t.inspections.store,
        cell: ({ row }) => <span className="font-medium text-slate-800">{row.original.storeName ?? "—"}</span>,
      },
      {
        accessorKey: "establishmentId",
        header: t.common.establishmentId,
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.establishmentId ?? "—"}</span>,
      },
      { accessorKey: "inspectionDate", header: t.common.date, cell: ({ row }) => row.original.inspectionDate ?? "—" },
      { accessorKey: "inspectionResult", header: t.common.result, cell: ({ row }) => <ResultBadge result={row.original.inspectionResult} /> },
      { accessorKey: "score", header: t.common.score, cell: ({ row }) => (row.original.score ?? "—") },
      { accessorKey: "grade", header: t.common.grade, cell: ({ row }) => row.original.grade ?? "—" },
      {
        accessorKey: "violationSeverity",
        header: t.common.severity,
        cell: ({ row }) => {
          const s = row.original.violationSeverity;
          if (!s) return "—";
          const critical = s.includes("Critical");
          return <Badge color="#fff" bg={critical ? "#C00000" : "#64748B"}>{critical ? "Critical" : "Non-crit."}</Badge>;
        },
      },
      {
        accessorKey: "standardizedCategoryId",
        header: t.common.stdCategory,
        cell: ({ row }) => {
          const id = row.original.standardizedCategoryId;
          return id ? <span className="text-slate-600">{catMap[id] ?? id}</span> : "—";
        },
      },
      { accessorKey: "followupRequired", header: t.common.followup, cell: ({ row }) => row.original.followupRequired ?? "—" },
      { accessorKey: "riskLevel", header: t.common.riskLevel, cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} /> },
      {
        accessorKey: "sourceType",
        header: t.common.sourceType,
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.sourceType ?? "—"}</span>,
      },
    ],
    [t, catMap],
  );

  const facets: FacetCfg[] = useMemo(
    () => [
      { columnId: "jurisdiction", label: t.common.jurisdiction },
      { columnId: "brand", label: t.common.brand },
      { columnId: "inspectionResult", label: t.common.result },
      { columnId: "grade", label: t.common.grade },
      { columnId: "violationSeverity", label: t.common.severity },
      { columnId: "standardizedCategoryId", label: t.common.stdCategory, format: (v) => catMap[Number(v)] ?? v },
      { columnId: "riskLevel", label: t.common.riskLevel, format: (v) => riskLabel(v, locale) },
      { columnId: "sourceType", label: t.common.sourceType },
    ],
    [t, catMap, locale],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.inspections.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.inspections.subtitle}</p>
      </div>
      <DataTable
        data={data}
        columns={columns}
        facets={facets}
        searchableText={(r) =>
          [r.storeName, r.establishmentId, r.address, r.brand, r.jurisdiction, r.chineseViolationSummary, r.englishViolationSummary, r.regulatoryAgency]
            .filter(Boolean)
            .join(" ")
        }
        initialQ={initialQ}
        searchPlaceholder={t.top.search}
        getRowHref={(r) => `/inspections/${r.id}`}
      />
    </div>
  );
}
