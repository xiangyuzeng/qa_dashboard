/** State & Local Regulation (Module 3) — over Sheet4 records, with a compliance-countdown hero.
 * Static: data + Gantt computed at build time; the `q` deep-link is read client-side (Suspense). */
import { Suspense } from "react";
import { getRegulations } from "@/src/lib/data";
import { complianceGantt, ganttDomain } from "@/src/lib/aggregate";
import { RegulationClient } from "@/src/components/regulation/RegulationClient";
import { isStaticBaseline } from "@/src/lib/dataMode";

// Re-render daily so the compliance countdown ("today" + days-to-effective) advances
// instead of freezing at build time (audit: SSG date-freeze).
export const revalidate = 86400;

export default function RegulationPage() {
  const data = getRegulations();
  const todayIso = new Date().toISOString().slice(0, 10);
  const gantt = complianceGantt(data, todayIso);
  return (
    <Suspense>
      <RegulationClient data={data} gantt={gantt} domain={ganttDomain(gantt, todayIso)} todayIso={todayIso} staticBaseline={isStaticBaseline(data)} />
    </Suspense>
  );
}
