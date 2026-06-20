/** Module 7 — 建筑与职业安全 Building & Occupational Safety. Premises-universal (no appliesToUs). */
import { Suspense } from "react";
import { getBuilding } from "@/src/lib/data";
import { ComplianceClient } from "@/src/components/compliance/ComplianceClient";

export default function BuildingPage() {
  return (
    <Suspense>
      <ComplianceClient data={getBuilding()} module="building" showApplies={false} />
    </Suspense>
  );
}
