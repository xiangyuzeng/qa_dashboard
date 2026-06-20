"use client";

import { useLocale } from "@/src/lib/i18n/locale";
import { RESULT_COLORS, RISK_COLORS, riskLabel } from "@/src/lib/colors";

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
  const { locale } = useLocale();
  if (status === "na") {
    return (
      <Badge color="#fff" bg="#64748B">
        {needsVerification ? (locale === "zh" ? "待核实" : "To verify") : locale === "zh" ? "待补充" : "Pending data"}
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
