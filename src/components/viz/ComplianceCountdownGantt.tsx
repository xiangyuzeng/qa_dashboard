"use client";

/**
 * Compliance-countdown Gantt (Regulation hero) — one bar per regulation from
 * publication → effective on a shared date axis, with a vertical "today" line.
 * Positioned divs (not SVG) for responsive + print. Null dates handled gracefully:
 * null start → dot at the effective date; null end → striped "no effective date" bar.
 */
import { Badge } from "@/src/components/ui";
import type { GanttBar } from "@/src/lib/aggregate";
import type { Locale } from "@/src/lib/i18n/messages";

const BUCKET_COLOR: Record<GanttBar["bucket"], string> = {
  imminent: "#C00000",
  soon: "#B45309",
  later: "#15803D",
  past: "#64748B",
  unknown: "#94A3B8",
};

const GUTTER = 36; // label-gutter width, percent of the full row

export function ComplianceCountdownGantt({
  bars,
  domain,
  todayIso,
  locale,
  labels,
}: {
  bars: GanttBar[];
  domain: { min: string; max: string };
  todayIso: string;
  locale: Locale;
  labels: { today: string; inEffect: string; noEffectiveDate: string };
}) {
  if (!bars.length)
    return <div className="flex h-32 items-center justify-center text-sm text-slate-400">—</div>;

  const t0 = new Date(domain.min + "T00:00:00Z").getTime();
  const t1 = new Date(domain.max + "T00:00:00Z").getTime();
  const span = Math.max(1, t1 - t0);
  const pct = (iso: string) => {
    const t = new Date(iso + "T00:00:00Z").getTime();
    return Math.min(100, Math.max(0, ((t - t0) / span) * 100));
  };
  const todayPct = pct(todayIso);
  const todayLeft = GUTTER + (todayPct / 100) * (100 - GUTTER);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{domain.min}</span>
        <span>{domain.max}</span>
      </div>
      <div className="relative">
        <div
          className="pointer-events-none absolute bottom-0 top-6 z-10 w-px bg-[#0EA5E9]"
          style={{ left: `${todayLeft}%` }}
        >
          <span className="absolute -top-5 -translate-x-1/2 whitespace-nowrap rounded bg-[#0EA5E9] px-1 text-[9px] text-white">
            {labels.today} {todayIso}
          </span>
        </div>
        <div className="space-y-1.5 pt-6">
          {bars.map((b) => {
            const label = (locale === "zh" ? b.labelZh : b.labelEn) || b.labelEn || b.labelZh || "—";
            const color = BUCKET_COLOR[b.bucket];
            const startPct = b.start ? pct(b.start) : null;
            const endPct = b.end ? pct(b.end) : null;
            return (
              <div
                key={b.id}
                className="grid items-center gap-2"
                style={{ gridTemplateColumns: `${GUTTER}% ${100 - GUTTER}%` }}
              >
                <div className="min-w-0 pr-2">
                  <div className="truncate text-xs font-medium text-slate-700" title={label}>
                    {b.href ? (
                      <a href={b.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {label}
                      </a>
                    ) : (
                      label
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {b.jurisdiction && <Badge>{b.jurisdiction}</Badge>}
                    {b.status && (
                      <Badge color="#0c4a6e" bg="#e0f2fe">
                        {b.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="relative h-6 rounded bg-slate-50">
                  {startPct != null && endPct == null && (
                    <div
                      className="absolute inset-y-1 rounded"
                      style={{
                        left: `${startPct}%`,
                        right: 0,
                        background:
                          "repeating-linear-gradient(45deg, #cbd5e1, #cbd5e1 4px, #e2e8f0 4px, #e2e8f0 8px)",
                      }}
                      title={labels.noEffectiveDate}
                    />
                  )}
                  {startPct != null && endPct != null && (
                    <div
                      className="absolute inset-y-1 rounded"
                      style={{
                        left: `${Math.min(startPct, endPct)}%`,
                        width: `${Math.max(2, Math.abs(endPct - startPct))}%`,
                        backgroundColor: color,
                      }}
                    />
                  )}
                  {startPct == null && endPct != null && (
                    <div className="absolute inset-y-0 flex items-center" style={{ left: `${endPct}%` }}>
                      <span
                        className="h-2.5 w-2.5 -translate-x-1/2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  )}
                  {endPct != null && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap pl-1 text-[10px] font-medium"
                      style={{ left: `${Math.min(endPct, 86)}%`, color }}
                    >
                      {b.daysToEffective == null
                        ? ""
                        : b.daysToEffective < 0
                          ? labels.inEffect
                          : `${b.daysToEffective}d`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
