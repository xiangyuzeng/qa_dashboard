"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { DataTable, type FacetCfg } from "@/src/components/table/DataTable";
import { RiskBadge, Badge, SectionCard, ExpandableText, SourceLangBadge } from "@/src/components/ui";
import { HBar } from "@/src/components/charts";
import { riskLabel, BAR_DEFAULT } from "@/src/lib/colors";
import { fmtDate } from "@/src/lib/i18n/util";
import type { SentimentRecord } from "@/src/lib/schema";
import type { Locale } from "@/src/lib/i18n/messages";

/** Friendly bilingual labels for the sentiment incident categories. */
const SENTIMENT_LABEL: Record<string, { zh: string; en: string }> = {
  negative_coverage: { zh: "负面报道", en: "Negative coverage" },
  consumer_complaint: { zh: "消费者投诉", en: "Consumer complaint" },
  allergen_report: { zh: "过敏原事件", en: "Allergen report" },
  foreign_object: { zh: "异物", en: "Foreign object" },
  spoilage: { zh: "变质", en: "Spoilage" },
  pest_report: { zh: "虫害", en: "Pest report" },
  competitor_incident: { zh: "竞品事件", en: "Competitor incident" },
  brand_reputation: { zh: "品牌声誉", en: "Brand reputation" },
};
const sentLabel = (v: string, locale: Locale) =>
  (locale === "zh" ? SENTIMENT_LABEL[v]?.zh : SENTIMENT_LABEL[v]?.en) ?? v;

export function SentimentClient({
  data,
  byCategory,
}: {
  data: SentimentRecord[];
  byCategory: { category: string; count: number }[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const initialQ = useSearchParams().get("q") ?? "";

  const columns = useMemo<ColumnDef<SentimentRecord, unknown>[]>(
    () => [
      {
        accessorKey: "sentimentCategory",
        header: t.sentiment.incidentType,
        cell: ({ row }) =>
          row.original.sentimentCategory ? (
            <Badge color="#7c2d12" bg="#ffedd5">{sentLabel(row.original.sentimentCategory, locale)}</Badge>
          ) : (
            "—"
          ),
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
          return (
            <div className="max-w-xl">
              {r.sourceUrl ? (
                <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brandnavy hover:underline">
                  {title} ↗
                </a>
              ) : (
                <span className="font-medium text-slate-800">{title}</span>
              )}
              <SourceLangBadge chineseTitle={r.chineseTitle} englishTitle={r.englishTitle} mtAt={r.provenance?.mtAt} />
              {summary && <ExpandableText text={summary} className="mt-0.5" />}
            </div>
          );
        },
      },
      { accessorKey: "outlet", header: t.sentiment.outlet, cell: ({ row }) => <span className="text-xs text-slate-500">{row.original.outlet ?? "—"}</span> },
      { accessorKey: "brandMentioned", header: t.sentiment.brandMentioned, cell: ({ row }) => row.original.brandMentioned ?? "—" },
      { accessorKey: "publicationDate", header: t.common.date, cell: ({ row }) => fmtDate(row.original.publicationDate) || "—" },
      {
        accessorKey: "credibility",
        header: t.sentiment.credibility,
        cell: ({ row }) => (row.original.credibility ? <Badge>{row.original.credibility}</Badge> : "—"),
      },
      { accessorKey: "riskLevel", header: t.common.riskLevel, cell: ({ row }) => <RiskBadge risk={row.original.riskLevel} /> },
    ],
    [t, locale],
  );

  const facets: FacetCfg[] = useMemo(
    () => [
      { columnId: "sentimentCategory", label: t.sentiment.incidentType, format: (v) => sentLabel(v, locale) },
      { columnId: "brandMentioned", label: t.common.brand },
      { columnId: "riskLevel", label: t.common.riskLevel, format: (v) => riskLabel(v, locale) },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.sentiment.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.sentiment.subtitle}</p>
        <p className="mt-1 text-xs italic text-slate-400">{t.sentiment.linkOnlyNote}</p>
      </div>
      <SectionCard title={t.sentiment.byIncidentType}>
        <HBar data={byCategory.map((d) => ({ label: sentLabel(d.category, locale), value: d.count, color: BAR_DEFAULT }))} />
      </SectionCard>
      <DataTable
        data={data}
        columns={columns}
        facets={facets}
        searchableText={(r) => [r.chineseTitle, r.englishTitle, r.chineseSummary, r.englishSummary, r.outlet].filter(Boolean).join(" ")}
        initialQ={initialQ}
        searchPlaceholder={t.top.search}
        resultsLabel={t.inspections.results}
      />
    </div>
  );
}
