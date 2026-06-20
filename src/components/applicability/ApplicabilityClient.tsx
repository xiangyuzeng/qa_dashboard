"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { DataTable, type FacetCfg } from "@/src/components/table/DataTable";
import { Badge, SectionCard, KpiCard, ApplicabilityBadge } from "@/src/components/ui";
import { fmtDate, pickLang } from "@/src/lib/i18n/util";
import { evaluate, type ApplicabilityVerdict } from "@/src/lib/applicability";
import type { ApplicabilityRule, CompanyProfile, CountBasis } from "@/src/lib/schema";
import type { Locale } from "@/src/lib/i18n/messages";

/** Bilingual labels for the trigger dimension + status (kept local, like RegulationClient). */
const TRIGGER_LABEL: Record<string, { zh: string; en: string }> = {
  location_count: { zh: "门店数量", en: "Location count" },
  is_fast_food_model: { zh: "快餐模式 + 数量", en: "Fast-food model + count" },
  combined_site_sqft: { zh: "合计面积 (sqft)", en: "Combined site sqft" },
  single_site_sqft: { zh: "单店面积 (sqft)", en: "Single-site sqft" },
  always: { zh: "始终", en: "Always" },
  needs_verification: { zh: "需核实", en: "Needs verification" },
};
const STATUS_FACET_LABEL: Record<string, { zh: string; en: string }> = {
  applies: { zh: "适用", en: "Applies" },
  approaching: { zh: "临近", en: "Approaching" },
  not_yet: { zh: "暂不适用", en: "Not yet" },
  always: { zh: "始终适用", en: "Always" },
  na: { zh: "待补充/待核实", en: "Pending / to verify" },
};
const triggerLabel = (v: string, l: Locale) => (l === "zh" ? TRIGGER_LABEL[v]?.zh : TRIGGER_LABEL[v]?.en) ?? v;
const statusFacetLabel = (v: string, l: Locale) => (l === "zh" ? STATUS_FACET_LABEL[v]?.zh : STATUS_FACET_LABEL[v]?.en) ?? v;

const NYC = "New York City";

export function ApplicabilityClient({
  profile,
  rules,
  initialVerdicts,
}: {
  profile: CompanyProfile;
  rules: ApplicabilityRule[];
  initialVerdicts: ApplicabilityVerdict[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const initialQ = useSearchParams().get("q") ?? "";

  const baseOpen = profile.national.openLocationCount;
  const baseSqft = profile.jurisdictions.find((j) => j.jurisdiction === NYC)?.combinedFloorAreaSqft ?? null;

  const [scenOpen, setScenOpen] = useState<number | null>(baseOpen);
  const [scenSqft, setScenSqft] = useState<number | null>(baseSqft);
  const [fwBasis, setFwBasis] = useState<CountBasis>("open");

  const dirty = scenOpen !== baseOpen || scenSqft !== baseSqft || fwBasis !== "open";

  const nudged = useMemo<CompanyProfile>(
    () => ({
      ...profile,
      national: { ...profile.national, openLocationCount: scenOpen },
      jurisdictions: profile.jurisdictions.map((j) =>
        j.jurisdiction === NYC ? { ...j, combinedFloorAreaSqft: scenSqft } : j,
      ),
    }),
    [profile, scenOpen, scenSqft],
  );

  const verdicts = useMemo(
    () => (dirty ? evaluate(nudged, rules, { fairWorkweekBasis: fwBasis }) : initialVerdicts),
    [dirty, nudged, rules, fwBasis, initialVerdicts],
  );

  const applies = verdicts.filter((v) => v.status === "applies").length;
  const approaching = verdicts.filter((v) => v.status === "approaching").length;
  const pending = verdicts.filter((v) => v.status === "na").length;

  // Fair Workweek "N stores from the threshold" at the active basis.
  const fw = verdicts.find((v) => v.rule.triggerDimension === "is_fast_food_model");
  const fwAway = fw && fw.ourValue != null && fw.threshold != null && fw.ourValue < fw.threshold ? fw.threshold - fw.ourValue : null;

  const columns = useMemo<ColumnDef<ApplicabilityVerdict, unknown>[]>(
    () => [
      {
        id: "rule",
        accessorFn: (v) => pickLang(locale, v.rule.regulationName.zh, v.rule.regulationName.en),
        header: t.applicability.rule,
        cell: ({ row }) => {
          const r = row.original.rule;
          const name = pickLang(locale, r.regulationName.zh, r.regulationName.en);
          const action = pickLang(locale, r.actionZh, r.actionEn);
          return (
            <div className="max-w-md">
              <a href={r.thresholdSourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brandnavy hover:underline">
                {name} ↗
              </a>
              {action && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{action}</p>}
            </div>
          );
        },
      },
      {
        id: "module",
        accessorFn: (v) => v.rule.module,
        header: t.applicability.domain,
        cell: ({ row }) => <Badge color="#0c4a6e" bg="#e0f2fe">{t.modules[row.original.rule.module as keyof typeof t.modules] ?? row.original.rule.module}</Badge>,
      },
      {
        id: "jurisdiction",
        accessorFn: (v) => v.rule.jurisdiction,
        header: t.common.jurisdiction,
        cell: ({ row }) => <span className="text-slate-600">{row.original.rule.jurisdiction}</span>,
      },
      {
        id: "trigger",
        accessorFn: (v) => v.rule.triggerDimension,
        header: t.applicability.trigger,
        cell: ({ row }) => <span className="text-xs text-slate-500">{triggerLabel(row.original.rule.triggerDimension, locale)}</span>,
      },
      {
        id: "threshold",
        accessorFn: (v) => v.threshold ?? "",
        header: t.applicability.threshold,
        cell: ({ row }) => <span className="tabular-nums">{row.original.threshold != null ? row.original.threshold.toLocaleString() : "—"}</span>,
      },
      {
        id: "ourValue",
        accessorFn: (v) => v.ourValue ?? "",
        header: t.applicability.ourValue,
        cell: ({ row }) =>
          row.original.ourValue != null ? (
            <span className="tabular-nums font-medium">{row.original.ourValue.toLocaleString()}</span>
          ) : (
            <span className="text-amber-700">{t.applicability.pendingData}</span>
          ),
      },
      {
        id: "status",
        accessorFn: (v) => v.status,
        header: locale === "zh" ? "适用?" : "Applies?",
        cell: ({ row }) => <ApplicabilityBadge status={row.original.status} needsVerification={row.original.rule.needsVerification} />,
      },
      {
        id: "distance",
        accessorFn: (v) => v.distance ?? 0,
        header: t.applicability.distance,
        cell: ({ row }) => {
          const d = row.original.distance;
          if (d == null) return <span className="text-slate-300">—</span>;
          const sign = d > 0 ? "+" : "";
          return <span className={`tabular-nums ${d >= 0 ? "text-emerald-700" : "text-amber-700"}`}>{sign}{d.toLocaleString()}</span>;
        },
      },
      {
        id: "effectiveDate",
        accessorFn: (v) => v.rule.effectiveDate ?? "",
        header: t.applicability.effective,
        cell: ({ row }) => fmtDate(row.original.rule.effectiveDate) || "—",
      },
    ],
    [t, locale],
  );

  const facets: FacetCfg[] = useMemo(
    () => [
      { columnId: "module", label: t.applicability.domain, format: (v) => t.modules[v as keyof typeof t.modules] ?? v },
      { columnId: "status", label: locale === "zh" ? "适用?" : "Applies?", format: (v) => statusFacetLabel(v, locale) },
      { columnId: "jurisdiction", label: t.common.jurisdiction },
    ],
    [t, locale],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.applicability.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.applicability.subtitle}</p>
      </div>

      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
        ⚠️ {t.applicability.unreviewed}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label={t.applicability.kpiApplies} value={applies} accent="#C00000" />
        <KpiCard label={t.applicability.kpiApproaching} value={approaching} accent="#B45309" />
        <KpiCard label={t.applicability.kpiPending} value={pending} accent="#64748B" />
      </div>

      <SectionCard
        title={t.applicability.whatIf}
        right={
          dirty ? (
            <button
              onClick={() => {
                setScenOpen(baseOpen);
                setScenSqft(baseSqft);
                setFwBasis("open");
              }}
              className="rounded-md px-2.5 py-1 text-xs text-slate-500 underline hover:text-slate-700"
            >
              {t.applicability.reset}
            </button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Open-store count nudge */}
          <div>
            <label className="flex items-baseline justify-between text-xs font-medium text-slate-600">
              <span>{t.applicability.nudgeStores}</span>
              <span className="tabular-nums text-sm font-bold text-brandnavy">{scenOpen ?? "—"}</span>
            </label>
            <input
              type="range"
              min={0}
              max={60}
              step={1}
              value={scenOpen ?? 0}
              onChange={(e) => setScenOpen(Number(e.target.value))}
              className="mt-2 w-full accent-brandnavy"
            />
            {fwAway != null && (
              <p className="mt-1 text-[11px] text-amber-700">
                {fwAway} {t.applicability.storesAway} · Fair Workweek
              </p>
            )}
          </div>

          {/* NYC combined sqft nudge */}
          <div>
            <label className="flex items-baseline justify-between text-xs font-medium text-slate-600">
              <span>{t.applicability.nudgeSqft}</span>
              <span className="tabular-nums text-sm font-bold text-brandnavy">{scenSqft != null ? scenSqft.toLocaleString() : "—"}</span>
            </label>
            <input
              type="range"
              min={0}
              max={60000}
              step={500}
              value={scenSqft ?? 0}
              onChange={(e) => setScenSqft(Number(e.target.value))}
              className="mt-2 w-full accent-brandnavy"
            />
          </div>

          {/* Fair Workweek basis toggle */}
          <div>
            <div className="text-xs font-medium text-slate-600">{t.applicability.fwBasis}</div>
            <div className="mt-2 flex overflow-hidden rounded-md border border-slate-300 text-xs">
              {([
                ["open", t.applicability.basisOpen],
                ["open_planned", t.applicability.basisOpenPlanned],
                ["all_status", t.applicability.basisAllStatus],
              ] as const).map(([b, lbl]) => (
                <button
                  key={b}
                  onClick={() => setFwBasis(b)}
                  className={`flex-1 px-2 py-1.5 ${fwBasis === b ? "bg-brandnavy text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <DataTable
        data={verdicts}
        columns={columns}
        facets={facets}
        searchableText={(v) =>
          [v.rule.regulationName.zh, v.rule.regulationName.en, v.rule.actionZh, v.rule.actionEn, v.rule.jurisdiction]
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
