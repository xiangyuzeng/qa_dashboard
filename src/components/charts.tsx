"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BAR_DEFAULT, RESULT_COLORS } from "@/src/lib/colors";

function Empty() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-slate-400">—</div>
  );
}

export type HBarItem = { label: string; value: number; color?: string };

/** Horizontal bar — good for long bilingual category/jurisdiction labels. */
export function HBar({ data, height }: { data: HBarItem[]; height?: number }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(160, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={190}
          tick={{ fontSize: 12, fill: "#334155" }}
        />
        <Tooltip cursor={{ fill: "#f1f5f9" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? BAR_DEFAULT} />
          ))}
          <LabelList dataKey="value" position="right" style={{ fontSize: 11, fill: "#475569" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ResultDonut({ data }: { data: { name: string; value: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
          {data.map((d, i) => (
            <Cell key={i} fill={RESULT_COLORS[d.name] ?? "#94A3B8"} />
          ))}
        </Pie>
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

/** Stacked horizontal bars — result mix per jurisdiction/brand. */
export function StackedBar({
  data,
  series,
  categoryKey,
  height,
}: {
  data: Record<string, string | number>[];
  series: string[];
  categoryKey: string;
  height?: number;
}) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(220, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis type="category" dataKey={categoryKey} width={150} tick={{ fontSize: 11, fill: "#334155" }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Bar key={s} dataKey={s} stackId="a" fill={RESULT_COLORS[s] ?? "#94A3B8"} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Grouped vertical bars — brand comparison. */
export function GroupedBar({
  data,
  series,
  categoryKey,
  colors,
  height,
}: {
  data: Record<string, string | number>[];
  series: { key: string; color?: string }[];
  categoryKey: string;
  colors?: Record<string, string>;
  height?: number;
}) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height ?? 300}>
      <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
        <XAxis dataKey={categoryKey} tick={{ fontSize: 11, fill: "#334155" }} interval={0} angle={-12} textAnchor="end" height={50} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} fill={s.color ?? (colors?.[s.key] ?? `hsl(${i * 60}, 60%, 45%)`)} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Multi-series line — trends over fixed periods. */
export function MultiLine({
  data,
  series,
  xKey,
  height,
}: {
  data: Record<string, string | number>[];
  series: { key: string; color: string }[];
  xKey: string;
  height?: number;
}) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={height ?? 300}>
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "#334155" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} dot={{ r: 2 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
