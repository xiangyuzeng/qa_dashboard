/** State & Local Regulation (Module 3) — over Sheet4 records, with a compliance-countdown hero.
 * Static: data + Gantt computed at build time; the `q` deep-link is read client-side (Suspense). */
import { Suspense } from "react";
import { getRegulations } from "@/src/lib/data";
import { complianceGantt, ganttDomain } from "@/src/lib/aggregate";
import { RegulationClient } from "@/src/components/regulation/RegulationClient";

export default function RegulationPage() {
  const data = getRegulations();
  const gantt = complianceGantt(data);
  return (
    <Suspense>
      <RegulationClient data={data} gantt={gantt} domain={ganttDomain(gantt)} />
    </Suspense>
  );
}
