/** Polite HTTP for the one-time pull: descriptive User-Agent, retry+backoff, rate-limit. */
const UA =
  process.env.HTTP_USER_AGENT ||
  "LuckinNA-QA-FoodSafety-Monitor/1.0 (one-time research pull; contact: qa@example.com)";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastCall = 0;
const MIN_GAP_MS = 250; // global polite spacing between requests

async function paced<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const wait = Math.max(0, lastCall + MIN_GAP_MS - now);
  if (wait) await sleep(wait);
  lastCall = Date.now();
  return fn();
}

export async function getJson<T = unknown>(
  url: string,
  opts: { headers?: Record<string, string>; retries?: number } = {},
): Promise<T> {
  const { headers = {}, retries = 3 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await paced(async () => {
        const res = await fetch(url, {
          headers: { "User-Agent": UA, Accept: "application/json", ...headers },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
        return (await res.json()) as T;
      });
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(600 * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function getText(
  url: string,
  opts: { headers?: Record<string, string>; retries?: number } = {},
): Promise<string> {
  const { headers = {}, retries = 3 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await paced(async () => {
        const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
        return await res.text();
      });
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(600 * (attempt + 1));
    }
  }
  throw lastErr;
}

/**
 * POST JSON with a JSON body + custom headers (same UA / pacing / retry-backoff as getJson).
 * Infra for key-gated collectors not yet wired — e.g. the FDA OII Import Refusals API,
 * which authenticates via `Authorization-User` + `Authorization-Key` headers. See docs/API_KEYS.md.
 */
export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  opts: { headers?: Record<string, string>; retries?: number } = {},
): Promise<T> {
  const { headers = {}, retries = 3 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await paced(async () => {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "User-Agent": UA,
            Accept: "application/json",
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
        return (await res.json()) as T;
      });
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(600 * (attempt + 1));
    }
  }
  throw lastErr;
}

/** Socrata SODA GET with optional app token (raises throttle ceiling; not required). */
export function socrata<T = unknown>(base: string, params: Record<string, string | number>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  const token = process.env.SOCRATA_APP_TOKEN;
  const headers = token ? { "X-App-Token": token } : undefined;
  return getJson<T[]>(`${base}?${qs.toString()}`, { headers });
}
