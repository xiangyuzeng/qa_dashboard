"use client";

/**
 * Risk heatmap (Overview centerpiece) — CSS grid, module × 5-level risk.
 * Dep-free (no Recharts primitive fits). Cell background = RISK_COLORS[risk]
 * on an opacity-scaled underlay (vs the global max), so cross-module magnitude
 * is comparable. Non-zero cells deep-link to the module route.
 */
import Link from "next/link";
import { RISK_COLORS } from "@/src/lib/colors";
import type { HeatRow } from "@/src/lib/aggregate";

export function RiskHeatmap({
  rows,
  riskLevels,
  moduleLabel,
  riskLabel,
}: {
  rows: HeatRow[];
  riskLevels: readonly string[];
  moduleLabel: (m: string) => string;
  riskLabel: (r: string) => string;
}) {
  if (!rows.length)
    return <div className="flex h-32 items-center justify-center text-sm text-slate-400">—</div>;

  const max = Math.max(1, ...rows.flatMap((r) => r.cells.map((c) => c.count)));
  const gridCols = `140px repeat(${riskLevels.length}, minmax(0, 1fr))`;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px] text-xs">
        <div className="grid items-end gap-1" style={{ gridTemplateColumns: gridCols }}>
          <div />
          {riskLevels.map((risk) => (
            <div key={risk} className="px-1 pb-1 text-center font-medium text-slate-500">
              {riskLabel(risk)}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {rows.map((row) => (
            <div
              key={row.module}
              className="grid items-stretch gap-1"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className="flex items-center pr-2 font-medium text-slate-700">
                {moduleLabel(row.module)}
              </div>
              {row.cells.map((cell) => {
                const opacity = cell.count === 0 ? 0.06 : 0.25 + 0.75 * (cell.count / max);
                const strong = opacity > 0.5;
                const inner = (
                  <div className="relative h-11 w-full overflow-hidden rounded">
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: RISK_COLORS[cell.risk] ?? "#64748B", opacity }}
                    />
                    <span
                      className={`absolute inset-0 flex items-center justify-center font-semibold ${
                        strong ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {cell.count}
                    </span>
                  </div>
                );
                return cell.count > 0 ? (
                  <Link
                    key={cell.risk}
                    href={cell.href}
                    className="block rounded transition hover:ring-2 hover:ring-brandnavy/40"
                    title={`${moduleLabel(cell.module)} · ${riskLabel(cell.risk)} · ${cell.count}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div key={cell.risk}>{inner}</div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
