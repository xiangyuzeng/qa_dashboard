/** Module 6 — 用工合规 Labor & Employment. Servable records + engine-stamped appliesToUs. */
import { Suspense } from "react";
import { getLabor } from "@/src/lib/data";
import { ComplianceClient } from "@/src/components/compliance/ComplianceClient";

export default function LaborPage() {
  return (
    <Suspense>
      <ComplianceClient data={getLabor()} module="labor" showApplies />
    </Suspense>
  );
}
