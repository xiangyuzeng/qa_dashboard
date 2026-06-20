"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { SectionCard, RiskBadge, Badge } from "@/src/components/ui";
import { pickLang } from "@/src/lib/i18n/util";
import type { ReviewItem, ReviewReason } from "@/src/lib/review";

type Decision = "approved" | "rejected";
const STORAGE_KEY = "qa_review_decisions_v1";
const REASON_COLOR: Record<ReviewReason, string> = {
  awaitingSignoff: "#7C3AED",
  enforcementAction: "#C00000",
  ownedStoreAdverse: "#B45309",
  competitorEnforcement: "#1F4E79",
};

export function ReviewClient({ queue }: { queue: ReviewItem[] }) {
  const t = useT();
  const { locale } = useLocale();
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | "undecided" | Decision>("all");

  // localStorage only (static deploy has no backend) — load after mount to avoid hydration mismatch.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDecisions(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  }, [decisions, mounted]);

  const set = (id: string, d: Decision | null) =>
    setDecisions((prev) => {
      const next = { ...prev };
      if (d === null) delete next[id];
      else next[id] = d;
      return next;
    });

  const counts = useMemo(() => {
    let approved = 0,
      rejected = 0;
    for (const it of queue) {
      if (decisions[it.id] === "approved") approved++;
      else if (decisions[it.id] === "rejected") rejected++;
    }
    return { total: queue.length, approved, rejected, undecided: queue.length - approved - rejected };
  }, [queue, decisions]);

  const shown = queue.filter((it) => {
    const d = decisions[it.id];
    if (filter === "all") return true;
    if (filter === "undecided") return !d;
    return d === filter;
  });

  const exportDecisions = () => {
    const rows = queue
      .filter((it) => decisions[it.id])
      .map((it) => ({ id: it.id, module: it.module, decision: decisions[it.id], title: it.titleEn }));
    const blob = new Blob([JSON.stringify({ decisions: rows }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qa_review_decisions.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const Stat = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white px-4 py-2.5">
      <span className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );

  const FilterTab = ({ id, label }: { id: typeof filter; label: string }) => (
    <button
      onClick={() => setFilter(id)}
      aria-pressed={filter === id}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
        filter === id ? "bg-brandnavy text-white" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{t.review.title}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t.review.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t.review.undecided} value={mounted ? counts.undecided : counts.total} color="#0F172A" />
        <Stat label={t.review.approved} value={mounted ? counts.approved : 0} color="#15803D" />
        <Stat label={t.review.rejected} value={mounted ? counts.rejected : 0} color="#C00000" />
        <Stat label={t.review.pending} value={counts.total} color="#1F4E79" />
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">{t.review.note}</div>

      <SectionCard
        title={t.review.title}
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterTab id="all" label={t.review.filterAll} />
            <FilterTab id="undecided" label={t.review.undecided} />
            <FilterTab id="approved" label={t.review.approved} />
            <FilterTab id="rejected" label={t.review.rejected} />
            <button
              onClick={exportDecisions}
              className="ml-1 rounded-md border border-brandnavy px-2.5 py-1 text-xs font-medium text-brandnavy hover:bg-brandnavy/5"
            >
              {t.review.export}
            </button>
            <button
              onClick={() => setDecisions({})}
              className="rounded-md px-2.5 py-1 text-xs text-slate-500 underline hover:text-slate-700"
            >
              {t.review.reset}
            </button>
          </div>
        }
      >
        {shown.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t.review.empty}</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((it) => {
              const d = mounted ? decisions[it.id] : undefined;
              return (
                <li
                  key={`${it.module}:${it.id}`}
                  className={`break-avoid rounded-md border p-3 ${
                    d === "approved"
                      ? "border-emerald-200 bg-emerald-50/40"
                      : d === "rejected"
                        ? "border-red-200 bg-red-50/40 opacity-70"
                        : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge color="#fff" bg={REASON_COLOR[it.reason]}>
                      {t.review.reasons[it.reason]}
                    </Badge>
                    <RiskBadge risk={it.riskLevel} />
                    <span className="font-medium text-slate-800">
                      {it.href ? (
                        <Link href={it.href} className="hover:underline">
                          {pickLang(locale, it.titleZh, it.titleEn) || it.id}
                        </Link>
                      ) : (
                        pickLang(locale, it.titleZh, it.titleEn) || it.id
                      )}
                    </span>
                    <span className="text-xs text-slate-400">
                      {[t.modules[it.module as keyof typeof t.modules] ?? it.module, it.agency, it.brand, it.jurisdiction, it.date]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      {d ? (
                        <>
                          <span className={`text-xs font-semibold ${d === "approved" ? "text-emerald-700" : "text-red-700"}`}>
                            {d === "approved" ? t.review.approved : t.review.rejected}
                          </span>
                          <button onClick={() => set(it.id, null)} className="text-xs text-slate-500 underline hover:text-slate-700">
                            {t.review.undo}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => set(it.id, "approved")}
                            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            {t.review.approve}
                          </button>
                          <button
                            onClick={() => set(it.id, "rejected")}
                            className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            {t.review.reject}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">{pickLang(locale, it.reasonDetailZh, it.reasonDetailEn)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
