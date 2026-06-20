/** Trends & Analytics (surface 6) — over time, category frequency, severity, repeat violations. */
import { getInspections } from "@/src/lib/data";
import {
  trendsOverTime,
  categoryCounts,
  severityByCategory,
  repeatGroups,
  enforcementByAgency,
  repeatOffenders,
} from "@/src/lib/aggregate";
import { TrendsClient } from "@/src/components/trends/TrendsClient";

export default function TrendsPage() {
  const insp = getInspections();
  return (
    <TrendsClient
      overTime={trendsOverTime(insp)}
      categories={[...categoryCounts(insp)].sort((a, b) => b.count - a.count)}
      severity={severityByCategory(insp)}
      repeats={repeatGroups(insp)}
      agencies={enforcementByAgency(insp)}
      offenders={repeatOffenders(insp)}
    />
  );
}
