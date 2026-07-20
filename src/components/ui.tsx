"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { RESULT_COLORS, RISK_COLORS, riskLabel } from "@/src/lib/colors";

/**
 * Amber "policy baseline · not real-time" notice for modules whose rows are entirely curated seeds
 * (labor / building / environment / consumer / state-local regulation). Rendered under a module
 * title, gated on `isStaticBaseline(...)` from src/lib/dataMode — so it disappears automatically
 * once a live enforcement feed is wired. Prevents the site-wide "as of <today>" date from implying
 * these static rules were refreshed today.
 */
export function StaticBaselineNotice() {
  const t = useT();
  return (
    <p className="mt-1.5 flex max-w-3xl items-start gap-1.5 text-xs text-amber-700">
      <span className="mt-px inline-block whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
        {t.common.baselineBadge}
      </span>
      <span>{t.common.baselineNote}</span>
    </p>
  );
}

/**
 * Summary text that is line-clamped by default and reveals its full content two ways:
 *  1. native hover tooltip (`title`) for a quick peek while collapsed;
 *  2. an inline “Show more / Show less” toggle that expands in place (works on touch too).
 * The toggle only renders when the text is actually being clamped — short summaries stay clean.
 * Used in dense table cells (e.g. the Regulation title column) where the summary would otherwise
 * be cut off with no way to read the rest.
 */
export function ExpandableText({
  text,
  className = "",
  clampClass = "line-clamp-2",
  textClass = "text-xs text-slate-500",
}: {
  text: string;
  className?: string;
  clampClass?: string;
  textClass?: string;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Only measure while collapsed; when expanded the clamp is off (no overflow) and the
    // reffed node is unmounted, so keep the last measured `clamped` value.
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  if (!text) return null;

  // Expanded: full text with the "Show less" toggle inline at the end of the last line.
  if (expanded) {
    return (
      <div className={className}>
        <p className={textClass}>
          {text}{" "}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            className="whitespace-nowrap align-baseline text-[11px] font-medium text-brandnavy hover:underline"
          >
            {t.common.showLess}
          </button>
        </p>
      </div>
    );
  }

  // Collapsed: line-clamped text; the "Show more" toggle sits at the bottom-right of the
  // last visible line as a small chip (own white background so it reads cleanly over any
  // row color — default / hover:slate-50 / high-risk tint).
  return (
    <div className={`relative ${className}`}>
      <p ref={ref} title={text} className={`${textClass} ${clampClass}`}>
        {text}
      </p>
      {clamped && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="absolute bottom-0 right-0 rounded bg-white pl-2 text-[11px] font-medium text-brandnavy hover:underline"
        >
          {t.common.showMore}
        </button>
      )}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="break-avoid rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`break-avoid rounded-lg border border-slate-200 bg-white p-4 ${className ?? ""}`}>
      {(title || right) && (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({
  children,
  color,
  bg,
}: {
  children: React.ReactNode;
  color?: string;
  bg?: string;
}) {
  return (
    <span
      className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color: color ?? "#334155", backgroundColor: bg ?? "#f1f5f9" }}
    >
      {children}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: string | null }) {
  const { locale } = useLocale();
  if (!risk) return <span className="text-slate-300">—</span>;
  const c = RISK_COLORS[risk] ?? "#64748B";
  return (
    <Badge color="#fff" bg={c}>
      {riskLabel(risk, locale)}
    </Badge>
  );
}

export function ResultBadge({ result }: { result: string | null }) {
  if (!result) return <span className="text-slate-300">—</span>;
  const c = RESULT_COLORS[result] ?? "#64748B";
  return (
    <Badge color="#fff" bg={c}>
      {result}
    </Badge>
  );
}

/** Applicability verdict badge — 适用 / 临近 / 暂不适用 / 始终适用 / 待补充 / 待核实. */
const APPLIC_STYLE: Record<string, { bg: string; zh: string; en: string }> = {
  applies: { bg: "#C00000", zh: "适用", en: "Applies" },
  approaching: { bg: "#B45309", zh: "临近", en: "Approaching" },
  not_yet: { bg: "#15803D", zh: "暂不适用", en: "Not yet" },
  always: { bg: "#1F4E79", zh: "始终适用", en: "Always" },
};
export function ApplicabilityBadge({
  status,
  needsVerification,
}: {
  status: string;
  needsVerification?: boolean;
}) {
  const { locale, t } = useLocale();
  if (status === "na") {
    return (
      <Badge color="#fff" bg="#64748B">
        {needsVerification ? t.applicability.toVerify : t.applicability.pendingData}
      </Badge>
    );
  }
  const s = APPLIC_STYLE[status];
  if (!s) return <span className="text-slate-300">—</span>;
  return (
    <Badge color="#fff" bg={s.bg}>
      {locale === "zh" ? s.zh : s.en}
    </Badge>
  );
}
