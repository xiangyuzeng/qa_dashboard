"use client";

import { LocaleProvider } from "@/src/lib/i18n/locale";

export function Providers({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
