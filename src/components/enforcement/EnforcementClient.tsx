"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { DataTable, type FacetCfg } from "@/src/components/table/DataTable";
import { RiskBadge, Badge, KpiCard, SectionCard, ExpandableText } from "@/src/components/ui";
import { riskLabel } from "@/src/lib/colors";
import { fmtDate, pickLang } from "@/src/lib/i18n/util";
import type { EnforcementRecord } from "@/src/lib/data";

/** Agency badge palette (DSNY green · DOB orange · DCWP indigo). */
const AGENCY_COLOR: Record<string, { color: string; bg: string }> = {
  DSNY: { color: "#065f46", bg: "#d1fae5" },
  DOB: { color: "#9a3412", bg: "#ffedd5" },
  DCWP: { color: "#3730a3", bg: "#e0e7ff" },
  OTHER: { color: "#475569", bg: "#e2e8f0" },
};

export function EnforcementClient({ data }: { data: EnforcementRecord[] }) {
  const t = useT();
  const { locale } = useLocale();
  const initialQ = useSearchParams().get("q") ?? "";
  const m = t.enforcement;

  const columns = useMemo<ColumnDef<EnforcementRecord, unknown>[]>(
    () => [
      {
        accessorKey: "agencyGroup",
        header: m.colAgency,
        cell: ({ row }) => {
          const g = row.original.agencyGroup;
          const c = AGENCY_COLOR[g] ?? AGENCY_COLOR.OTHER;
          return (
            <Badge color={c.color} bg={c.bg}>
              {g}
            </Badge>
          );
        },
      },
      {
        id: "violation",
        accessorFn: (r) => pickLang(locale, r.chineseTitle, r.englishTitle) ?? "",
        header: m.colViolation,
        cell: ({ row }) => {
          const r = row.original;
          const title = pickLang(locale, r.chineseTitle, r.englishTitle) ?? "—";
          const summary = pickLang(locale, r.chineseSummary, r.englishSummary);
          return (
            <div className="max-w-xl">
              <Link href={`/enforcement/${r.id}`} className="font-medium text-brandnavy hover:underline">
                {title}
              </Link>
              {summary && <ExpandableText text={summary} className="mt-0.5" />}
            </div>
          );
        },
      },
      {
        accessorKey: "agency",
        header: m.colIssuer,
        cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.agency ?? "—"}</span>,
      },
      {
        id: "date",
        accessorFn: (r) => r.date?.slice(0, 4) ?? "—",
        header: m.colDate,
        cell: ({ row }) =>
          row.original.date ? (
            <span className="whitespace-nowrap text-slate-700">{fmtDate(row.original.date)}</span>
          ) : (
            <span className="text-slate-300">—</span>
          ),
      },
      { accessorKey: "jurisdiction", header: t.common.jurisdiction, cell: ({ row }) => row.original.jurisdiction ?? "—" },
      { accessorKey: "riskLevel", header: t.common.riskLevel, cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} /> },
    ],
    [t, locale, m],
  );

  const facets: FacetCfg[] = useMemo(
    () => [
      { columnId: "agencyGroup", label: m.colAgency },
      { columnId: "jurisdiction", label: t.common.jurisdiction },
      { columnId: "date", label: m.colYear },
      { columnId: "riskLevel", label: t.common.riskLevel, format: (v) => riskLabel(v, locale) },
    ],
    [t, locale, m],
  );

  const byAgency = (g: string) => data.filter((r) => r.agencyGroup === g).length;
  const kpis = [
    { label: m.kpiTotal, value: data.length, accent: "#C00000" },
    { label: "DSNY", value: byAgency("DSNY") },
    { label: "DOB", value: byAgency("DOB") },
    { label: "DCWP", value: byAgency("DCWP") },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{m.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{m.subtitle}</p>
        <p className="mt-1 text-xs text-slate-400">{m.note}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} accent={k.accent} />
        ))}
      </div>

      {data.length === 0 ? (
        <SectionCard title={m.title}>
          <p className="py-8 text-center text-sm text-slate-400">{m.empty}</p>
        </SectionCard>
      ) : (
        <DataTable
          data={data}
          columns={columns}
          facets={facets}
          searchableText={(r) =>
            [r.englishTitle, r.chineseTitle, r.englishSummary, r.chineseSummary, r.agency, r.jurisdiction, r.recommendedAction]
              .filter(Boolean)
              .join(" ")
          }
          initialQ={initialQ}
          searchPlaceholder={t.top.search}
          resultsLabel={t.inspections.results}
        />
      )}
    </div>
  );
}
