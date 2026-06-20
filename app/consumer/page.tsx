/** Module 9 — 消费者与员工保护 Consumer & Worker Protection. Servable records + engine-stamped appliesToUs + domain hero. */
import { Suspense } from "react";
import { getConsumer } from "@/src/lib/data";
import { complianceCounts, complianceTimeline, complianceRiskByJurisdiction, ganttDomain } from "@/src/lib/aggregate";
import { ComplianceClient } from "@/src/components/compliance/ComplianceClient";

// Re-render daily so the compliance countdown ("today" + days-to-effective) advances
// instead of freezing at build time (audit: SSG date-freeze).
export const revalidate = 86400;

export default function ConsumerPage() {
  const data = getConsumer();
  const todayIso = new Date().toISOString().slice(0, 10);
  const timeline = complianceTimeline(data, todayIso);
  return (
    <Suspense>
      <ComplianceClient
        data={data}
        module="consumer"
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
