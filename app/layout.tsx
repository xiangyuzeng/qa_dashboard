import type { Metadata } from "next";
import "./globals.css";

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
  return (
    <html lang="zh">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
