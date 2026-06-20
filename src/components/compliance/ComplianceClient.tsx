"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { DataTable, type FacetCfg } from "@/src/components/table/DataTable";
import { RiskBadge, Badge, SectionCard } from "@/src/components/ui";
import { riskLabel } from "@/src/lib/colors";
import { fmtDate, pickLang } from "@/src/lib/i18n/util";
import type { Locale } from "@/src/lib/i18n/messages";

/** Structural common shape across the 4 compliance-domain records (module-specific keys optional). */
export type ComplianceCommon = {
  id: string;
  jurisdiction: string | null;
  chineseTitle: string | null;
  englishTitle: string | null;
  chineseSummary: string | null;
  englishSummary: string | null;
  agency: string | null;
  status: string | null;
  effectiveDate: string | null;
  riskLevel: string | null;
  recommendedAction: string | null;
  sourceUrl: string | null;
  topic: string | null;
  appliesToUs?: boolean | null;
  applicabilityThreshold?: string | null;
  regulationBillName?: string | null;
  codeStandardName?: string | null;
  regulationName?: string | null;
};

type ModuleKey = "labor" | "building" | "environment" | "consumer";

const STATUS_LABEL: Record<string, { zh: string; en: string }> = {
  Proposed: { zh: "提案中", en: "Proposed" },
  Passed: { zh: "已通过", en: "Passed" },
  "In effect": { zh: "已生效", en: "In effect" },
  "Pending effective": { zh: "待生效", en: "Pending effective" },
  Repealed: { zh: "已废止", en: "Repealed" },
  Monitoring: { zh: "持续关注", en: "Monitoring" },
};
// One combined topic-label map across the 4 domains (values are unique except the shared "other").
const TOPIC_LABEL: Record<string, { zh: string; en: string }> = {
  min_wage: { zh: "最低工资", en: "Min wage" },
  overtime_tip: { zh: "加班/小费", en: "Overtime/tip" },
  fair_workweek: { zh: "公平工作周", en: "Fair Workweek" },
  sick_safe_leave: { zh: "病假/安全假", en: "Sick & safe leave" },
  wage_theft: { zh: "欠薪", en: "Wage theft" },
  classification: { zh: "用工分类", en: "Classification" },
  union_nlrb: { zh: "工会/NLRB", en: "Union/NLRB" },
  discrimination_eeoc: { zh: "歧视/EEOC", en: "Discrimination/EEOC" },
  posting: { zh: "告示", en: "Posting" },
  osha_safety: { zh: "OSHA 安全", en: "OSHA safety" },
  building_code: { zh: "建筑规范", en: "Building code" },
  fire_code: { zh: "消防规范", en: "Fire code" },
  ada: { zh: "ADA 无障碍", en: "ADA" },
  permit_co: { zh: "许可/CO", en: "Permit/CO" },
  wastewater_fog: { zh: "油脂/废水", en: "Wastewater/FOG" },
  organics_compost: { zh: "有机垃圾", en: "Organics" },
  recycling: { zh: "回收", en: "Recycling" },
  trade_waste_hauler: { zh: "垃圾运输", en: "Trade waste" },
  refund_posting: { zh: "退款告示", en: "Refund posting" },
  signage_pricing: { zh: "标价/告示", en: "Signage/pricing" },
  deceptive_practices: { zh: "欺骗行为", en: "Deceptive practices" },
  licensing: { zh: "许可", en: "Licensing" },
  complaints: { zh: "投诉", en: "Complaints" },
  other: { zh: "其他", en: "Other" },
};
const statusLabel = (v: string, l: Locale) => (l === "zh" ? STATUS_LABEL[v]?.zh : STATUS_LABEL[v]?.en) ?? v;
const topicLabel = (v: string, l: Locale) => (l === "zh" ? TOPIC_LABEL[v]?.zh : TOPIC_LABEL[v]?.en) ?? v;
const nameOf = (r: ComplianceCommon) => r.regulationBillName ?? r.codeStandardName ?? r.regulationName ?? null;

function AppliesCell({ v }: { v: boolean | null | undefined }) {
  const t = useT();
  if (v == null) return <Badge color="#475569" bg="#e2e8f0">{t.compliance.appliesUnknown}</Badge>;
  return v ? (
    <Badge color="#fff" bg="#B45309">{t.compliance.appliesYes}</Badge>
  ) : (
    <Badge color="#fff" bg="#15803D">{t.compliance.appliesNo}</Badge>
  );
}

export function ComplianceClient({
  data,
  module,
  showApplies,
}: {
  data: ComplianceCommon[];
  module: ModuleKey;
  showApplies: boolean;
}) {
  const t = useT();
  const { locale } = useLocale();
  const initialQ = useSearchParams().get("q") ?? "";
  const m = t[module];

  const columns = useMemo<ColumnDef<ComplianceCommon, unknown>[]>(() => {
    const cols: ColumnDef<ComplianceCommon, unknown>[] = [
      { accessorKey: "jurisdiction", header: t.common.jurisdiction, cell: ({ row }) => row.original.jurisdiction ?? "—" },
      {
        id: "name",
        accessorFn: (r) => nameOf(r) ?? (locale === "zh" ? r.chineseTitle : r.englishTitle) ?? "",
        header: t.compliance.ruleName,
        cell: ({ row }) => {
          const r = row.original;
          const name = nameOf(r) ?? pickLang(locale, r.chineseTitle, r.englishTitle) ?? "—";
          const summary = pickLang(locale, r.chineseSummary, r.englishSummary);
          return (
            <div className="max-w-xl">
              {r.sourceUrl ? (
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brandnavy hover:underline">
                  {name} ↗
                </a>
              ) : (
                <span className="font-medium text-slate-800">{name}</span>
              )}
              {summary && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{summary}</p>}
            </div>
          );
        },
      },
      { accessorKey: "agency", header: t.compliance.agency, cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.agency ?? "—"}</span> },
      {
        accessorKey: "topic",
        header: t.compliance.topic,
        cell: ({ row }) => (row.original.topic ? <Badge color="#0c4a6e" bg="#e0f2fe">{topicLabel(row.original.topic, locale)}</Badge> : "—"),
      },
    ];
    if (showApplies) {
      cols.push({
        id: "appliesToUs",
        accessorFn: (r) => (r.appliesToUs == null ? "unknown" : r.appliesToUs ? "yes" : "no"),
        header: t.compliance.appliesToUs,
        cell: ({ row }) => <AppliesCell v={row.original.appliesToUs} />,
      });
    }
    cols.push(
      { accessorKey: "status", header: t.compliance.status, cell: ({ row }) => (row.original.status ? <Badge>{statusLabel(row.original.status, locale)}</Badge> : "—") },
      { accessorKey: "effectiveDate", header: t.compliance.effective, cell: ({ row }) => fmtDate(row.original.effectiveDate) || "—" },
      { accessorKey: "riskLevel", header: t.common.riskLevel, cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} /> },
    );
    return cols;
  }, [t, locale, showApplies]);

  const facets: FacetCfg[] = useMemo(() => {
    const f: FacetCfg[] = [
      { columnId: "jurisdiction", label: t.common.jurisdiction },
      { columnId: "topic", label: t.compliance.topic, format: (v) => topicLabel(v, locale) },
    ];
    if (showApplies) {
      f.push({
        columnId: "appliesToUs",
        label: t.compliance.appliesToUs,
        format: (v) => (v === "yes" ? t.compliance.appliesYes : v === "no" ? t.compliance.appliesNo : t.compliance.appliesUnknown),
      });
    }
    f.push(
      { columnId: "status", label: t.compliance.status, format: (v) => statusLabel(v, locale) },
      { columnId: "riskLevel", label: t.common.riskLevel, format: (v) => riskLabel(v, locale) },
    );
    return f;
  }, [t, locale, showApplies]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{m.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{m.subtitle}</p>
      </div>
      <DataTable
        data={data}
        columns={columns}
        facets={facets}
        searchableText={(r) =>
          [nameOf(r), r.chineseTitle, r.englishTitle, r.chineseSummary, r.englishSummary, r.agency, r.applicabilityThreshold, r.recommendedAction]
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
