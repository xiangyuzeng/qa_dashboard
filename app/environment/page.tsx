/** Module 8 — 环境卫生 Environmental & Sanitation. Servable records + engine-stamped appliesToUs + domain hero. */
import { Suspense } from "react";
import { getEnvironment } from "@/src/lib/data";
import { complianceCounts, complianceTimeline, complianceRiskByJurisdiction, ganttDomain } from "@/src/lib/aggregate";
import { ComplianceClient } from "@/src/components/compliance/ComplianceClient";

export default function EnvironmentPage() {
  const data = getEnvironment();
  const todayIso = new Date().toISOString().slice(0, 10);
  const timeline = complianceTimeline(data, todayIso);
  return (
    <Suspense>
      <ComplianceClient
        data={data}
        module="environment"
        showApplies
        counts={complianceCounts(data, todayIso)}
        timeline={timeline}
        domain={ganttDomain(timeline, todayIso)}
        byJurisdiction={complianceRiskByJurisdiction(data)}
        todayIso={todayIso}
      />
    </Suspense>
  );
}
