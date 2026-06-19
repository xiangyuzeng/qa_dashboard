import type { Metadata } from "next";
import "./globals.css";
import {
  getMeta,
  getRegulatory,
  getInspections,
  getImportExport,
  getRegulations,
  getSentiment,
} from "@/src/lib/data";
import { Providers } from "@/src/components/shell/Providers";
import { AppShell } from "@/src/components/shell/AppShell";

export const metadata: Metadata = {
  title: "Luckin NA · QA Food-Safety Dashboard",
  description:
    "Internal QA dashboard — U.S. food-safety regulation/recalls & local health-inspection intelligence for Luckin Coffee NA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const meta = getMeta();
  const alertCount =
    getRegulatory().filter((r) => r.alertTriggered).length +
    getInspections().filter((r) => r.alertTriggered).length +
    getImportExport().filter((r) => r.alertTriggered).length +
    getRegulations().filter((r) => r.alertTriggered).length +
    getSentiment().filter((r) => r.alertTriggered).length;

  return (
    <html lang="zh">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>
          <AppShell
            meta={{
              periodLabel: meta.reportingPeriod.label,
              dataAsOf: meta.dataAsOf,
              isSeedData: meta.isSeedData,
            }}
            alertCount={alertCount}
          >
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
