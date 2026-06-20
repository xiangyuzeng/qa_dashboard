/**
 * refresh_meta.ts — recompute data/v2/meta.json counts from the CURRENT data files,
 * WITHOUT re-running the full collector (which re-pulls every live feed and can flood
 * the curated snapshot). Mirrors the count logic in collect.ts (isServable + bySource)
 * so the dashboard KPI badges + both exports stay truthful after surgical data edits.
 *
 * Run: npx tsx prep/refresh_meta.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "data/v2");
const read = (f: string) => JSON.parse(readFileSync(join(OUT, f), "utf8"));

const MODULES: { file: string; key: string }[] = [
  { file: "regulatory.json", key: "regulatory" },
  { file: "inspections.json", key: "inspections" },
  { file: "import_export.json", key: "importExport" },
  { file: "regulations.json", key: "regulation" },
  { file: "sentiment.json", key: "sentiment" },
  { file: "labor.json", key: "labor" },
  { file: "building.json", key: "building" },
  { file: "environment.json", key: "environment" },
  { file: "consumer.json", key: "consumer" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isServable = (r: any) => r.reviewed && r.reviewStatus !== "rejected";

const meta = read("meta.json");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const all: any[] = [];
const counts: Record<string, number> = {};
for (const m of MODULES) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sv = (read(m.file) as any[]).filter(isServable);
  counts[m.key] = sv.length;
  all.push(...sv);
}

const alerts = all.filter((r) => r.alertTriggered).length;
const highRisk = all.filter((r) => r.riskLevel === "高风险").length;
const watch = all.filter((r) => r.riskLevel === "关注").length;
const bySource: Record<string, number> = {};
for (const r of all) {
  const sid = r.provenance?.sourceId ?? "unknown";
  bySource[sid] = (bySource[sid] ?? 0) + 1;
}

const latestCollectedAt = all
  .map((r) => r.provenance?.collectedAt)
  .filter(Boolean)
  .sort()
  .pop() as string | undefined;
const today = (latestCollectedAt ?? meta.dataAsOf + "T00:00:00.000Z").slice(0, 10);

meta.counts = {
  regulatory: counts.regulatory,
  inspections: counts.inspections,
  alerts,
  pendingReview: all.filter((r) => r.reviewStatus === "pending").length,
  importExport: counts.importExport,
  regulation: counts.regulation,
  sentiment: counts.sentiment,
  highRisk,
  watch,
  bySource,
  labor: counts.labor,
  building: counts.building,
  environment: counts.environment,
  consumer: counts.consumer,
};
meta.dataAsOf = today;

// Keep keyHighlights[0]'s high-risk/watch tally in sync with the recomputed numbers.
const kh = meta.summary?.keyHighlights;
if (Array.isArray(kh) && kh[0]) {
  kh[0] = {
    zh: `本月高风险事项 ${highRisk} 项、关注 ${watch} 项`,
    en: `${highRisk} high-risk and ${watch} watch items this period`,
  };
}

// Ensure a live provenance entry for the OATH enforcement feed reflects its real count.
if (Array.isArray(meta.provenance)) {
  const oathCount = bySource["nyc_oath"] ?? 0;
  const existing = meta.provenance.find((p: { sourceId?: string }) => p.sourceId === "nyc_oath");
  const entry = {
    jurisdictionId: "New York City",
    endpointOrUrl: "https://data.cityofnewyork.us/resource/jz4z-kudi.json",
    collectedAt: latestCollectedAt ?? meta.generatedAt,
    recordCount: oathCount,
    stalenessNote:
      "NYC OATH/ECB hearings — strict café-chain brand match (word-boundary aliases) across DSNY/DEP/FDNY/DOB/DCWP/DOHMH. Competitor enforcement only; no fabricated brand attribution.",
    reVerifyBeforeRelying: false,
    module: "inspection",
    status: "fetched",
    sourceId: "nyc_oath",
    name: "NYC OATH Hearings — multi-agency enforcement",
    accessType: "open-data",
    oneTimePullFeasible: "yes",
  };
  if (existing) Object.assign(existing, entry);
  else meta.provenance.push(entry);
}

writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(
  `meta refreshed: inspections ${counts.inspections} · highRisk ${highRisk} · watch ${watch} · alerts ${alerts} · dataAsOf ${today}`,
);
console.log("bySource:", JSON.stringify(bySource));
