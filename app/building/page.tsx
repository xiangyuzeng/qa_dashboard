/** Module 7 — 建筑与职业安全 Building & Occupational Safety. Premises-universal (no appliesToUs) + domain hero. */
import { Suspense } from "react";
import { getBuilding } from "@/src/lib/data";
import { complianceCounts, complianceTimeline, complianceRiskByJurisdiction, ganttDomain } from "@/src/lib/aggregate";
import { ComplianceClient } from "@/src/components/compliance/ComplianceClient";
import { isStaticBaseline } from "@/src/lib/dataMode";

// Re-render daily so the compliance countdown ("today" + days-to-effective) advances
// instead of freezing at build time (audit: SSG date-freeze).
export const revalidate = 86400;

export default function BuildingPage() {
  const data = getBuilding();
  const todayIso = new Date().toISOString().slice(0, 10);
  const timeline = complianceTimeline(data, todayIso);
  return (
    <Suspense>
      <ComplianceClient
        data={data}
        module="building"
        showApplies={false}
        counts={complianceCounts(data, todayIso)}
        timeline={timeline}
        domain={ganttDomain(timeline, todayIso)}
        byJurisdiction={complianceRiskByJurisdiction(data)}
        todayIso={todayIso}
        staticBaseline={isStaticBaseline(data)}
      />
    </Suspense>
  );
}
