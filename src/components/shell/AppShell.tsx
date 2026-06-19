"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useT } from "@/src/lib/i18n/locale";

type ShellMeta = { periodLabel: string; dataAsOf: string; isSeedData: boolean };

const NAV_GROUPS = [
  {
    label: "groupIntelligence",
    items: [
      { href: "/", key: "overview" },
      { href: "/alerts", key: "alerts" },
    ],
  },
  {
    label: "groupModules",
    items: [
      { href: "/intelligence", key: "intelligence" },
      { href: "/import", key: "import" },
      { href: "/regulation", key: "regulation" },
      { href: "/inspections", key: "inspections" },
      { href: "/sentiment", key: "sentiment" },
    ],
  },
  {
    label: "groupAnalytics",
    items: [
      { href: "/benchmark", key: "benchmark" },
      { href: "/trends", key: "trends" },
      { href: "/actions", key: "actions" },
      { href: "/sources", key: "sources" },
    ],
  },
] as const;

function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="flex overflow-hidden rounded-md border border-slate-300 text-xs font-medium">
      {(["zh", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 ${
            locale === l ? "bg-brandnavy text-white" : "bg-white text-slate-600 hover:bg-slate-50"
          }`}
          aria-pressed={locale === l}
        >
          {l === "zh" ? "中" : "EN"}
        </button>
      ))}
    </div>
  );
}

function Sidebar({ alertCount }: { alertCount: number }) {
  const t = useT();
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="no-print flex w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <div className="text-sm font-bold leading-tight text-brandnavy">{t.app.title}</div>
        <div className="mt-1 text-[11px] leading-tight text-slate-500">{t.app.subtitle}</div>
      </div>
      <nav className="flex-1 space-y-3 p-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <div className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {t.nav[group.label]}
            </div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                    active
                      ? "bg-brandnavy/10 font-semibold text-brandnavy"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{t.nav[item.key]}</span>
                  {item.key === "alerts" && alertCount > 0 && (
                    <span className="ml-2 rounded-full bg-risk-high px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {alertCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

function TopBar({ meta }: { meta: ShellMeta }) {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-5 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="rounded bg-slate-100 px-2 py-1">
          {t.top.period}: <span className="font-medium text-slate-700">{meta.periodLabel}</span>
        </span>
        <span className="hidden sm:inline">
          {t.top.dataAsOf}: <span className="font-medium text-slate-700">{meta.dataAsOf}</span>
        </span>
      </div>

      <form
        className="ml-auto flex-1 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/inspections${q ? `?q=${encodeURIComponent(q)}` : ""}`);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.top.search}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brandnavy"
        />
      </form>

      <LocaleToggle />

      <a
        href="/exports/monthly_report.xlsx"
        download="luckin_na_food_safety.xlsx"
        title={t.top.exportNote}
        className="rounded-md bg-brandnavy px-3 py-1.5 text-xs font-medium text-white hover:bg-brandnavy/90"
      >
        {t.top.export}
      </a>
      <a
        href="/exports/monthly_report.docx"
        download="luckin_na_food_safety.docx"
        title={t.top.exportNote}
        className="rounded-md border border-brandnavy px-3 py-1.5 text-xs font-medium text-brandnavy hover:bg-brandnavy/5"
      >
        {t.top.exportWord}
      </a>
      <button
        onClick={() => window.print()}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
      >
        {t.top.print}
      </button>
    </header>
  );
}

export function AppShell({
  meta,
  alertCount,
  children,
}: {
  meta: ShellMeta;
  alertCount: number;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="flex min-h-screen">
      <Sidebar alertCount={alertCount} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar meta={meta} />
        {meta.isSeedData && (
          <div className="no-print border-b border-amber-300 bg-amber-50 px-5 py-2 text-xs text-amber-900">
            ⚠️ {t.banner.seed}
          </div>
        )}
        <main className="min-w-0 flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
