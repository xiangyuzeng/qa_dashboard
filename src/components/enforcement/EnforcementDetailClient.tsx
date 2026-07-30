"use client";

import Link from "next/link";
import { useLocale, useT } from "@/src/lib/i18n/locale";
import { SectionCard, RiskBadge, Badge } from "@/src/components/ui";
import { fmtDate, pickLang } from "@/src/lib/i18n/util";
import type { EnforcementRecord } from "@/src/lib/data";

const AGENCY_COLOR: Record<string, { color: string; bg: string }> = {
  DSNY: { color: "#065f46", bg: "#d1fae5" },
  DOB: { color: "#9a3412", bg: "#ffedd5" },
  DCWP: { color: "#3730a3", bg: "#e0e7ff" },
  OTHER: { color: "#475569", bg: "#e2e8f0" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-1.5">
      <dt className="text-[11px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children ?? "—"}</dd>
    </div>
  );
}

export function EnforcementDetailClient({ record: r }: { record: EnforcementRecord }) {
  const t = useT();
  const { locale } = useLocale();
  const m = t.enforcement;
  const v = (x: string | number | null | undefined) => (x === null || x === undefined || x === "" ? "—" : x);
  const title = pickLang(locale, r.chineseTitle, r.englishTitle) ?? "—";
  const summary = pickLang(locale, r.chineseSummary, r.englishSummary);
  const c = AGENCY_COLOR[r.agencyGroup] ?? AGENCY_COLOR.OTHER;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/enforcement" className="text-sm text-brandnavy hover:underline">
          ‹ {t.common.back}
        </Link>
        <Badge color={c.color} bg={c.bg}>
          {r.agencyGroup}
        </Badge>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <RiskBadge risk={r.riskLevel} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title={m.fields} className="lg:col-span-2">
          <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <Row label={m.colAgency}>{v(r.agency)}</Row>
            <Row label={m.ticketNumber}>{v(r.ticketNumber)}</Row>
            <Row label={m.colDate}>{fmtDate(r.date) || "—"}</Row>
            <Row label={t.common.jurisdiction}>{v(r.jurisdiction)}</Row>
            <Row label={t.common.riskLevel}>
              <RiskBadge risk={r.riskLevel} />
            </Row>
          </dl>
          {summary && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{m.summary}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{summary}</p>
            </div>
          )}
          {r.recommendedAction && (
            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{m.recommended}</div>
              <p className="mt-1 text-sm text-slate-700">{r.recommendedAction}</p>
            </div>
          )}
        </SectionCard>

        <SectionCard title={m.lookupTitle}>
          <p className="text-sm text-slate-600">{m.govNote}</p>
          <a
            href={r.govUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block rounded-md bg-brandnavy px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {m.viewOnGov} ↗
          </a>
          {r.apiUrl && (
            <a
              href={r.apiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-xs text-slate-400 hover:text-slate-600 hover:underline"
            >
              {m.rawData} ↗
            </a>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
