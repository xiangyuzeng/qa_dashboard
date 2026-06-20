"use client";

/**
 * 合规姿态 Compliance Posture — a compact chip per applicability rule on the Overview
 * exec lede. Each chip links to /applicability. Computed server-side (the pure engine)
 * and passed down as plain data.
 */
import Link from "next/link";
import { useLocale } from "@/src/lib/i18n/locale";
import { ApplicabilityBadge } from "@/src/components/ui";

export type PostureItem = {
  id: string;
  nameZh: string;
  nameEn: string;
  status: string;
  needsVerification: boolean;
};

export function PostureStrip({ posture }: { posture: PostureItem[] }) {
  const { locale } = useLocale();
  if (!posture.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {posture.map((p) => (
        <Link
          key={p.id}
          href="/applicability"
          className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
        >
          <ApplicabilityBadge status={p.status} needsVerification={p.needsVerification} />
          <span className="max-w-[14rem] truncate text-xs text-slate-700">{locale === "zh" ? p.nameZh : p.nameEn}</span>
        </Link>
      ))}
    </div>
  );
}
