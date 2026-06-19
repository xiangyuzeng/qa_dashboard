"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { messages, type Locale, type Messages } from "./messages";

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  t: Messages;
};

const Ctx = createContext<LocaleCtx | null>(null);
const STORAGE_KEY = "qa-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // SSR renders the default (zh) to match the static prerender; client syncs after mount.
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "zh" || stored === "en") setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore (private mode etc.) */
    }
    document.documentElement.lang = l;
  }, []);

  const toggle = useCallback(
    () => setLocale(locale === "zh" ? "en" : "zh"),
    [locale, setLocale],
  );

  const value = useMemo<LocaleCtx>(
    () => ({ locale, setLocale, toggle, t: messages[locale] }),
    [locale, setLocale, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within <LocaleProvider>");
  return ctx;
}

/** Convenience: the message bundle for the active locale. */
export function useT(): Messages {
  return useLocale().t;
}
