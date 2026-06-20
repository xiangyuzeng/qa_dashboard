/** Module 8 — 环境卫生 Environmental & Sanitation. Servable records + engine-stamped appliesToUs. */
import { Suspense } from "react";
import { getEnvironment } from "@/src/lib/data";
import { ComplianceClient } from "@/src/components/compliance/ComplianceClient";

export default function EnvironmentPage() {
  return (
    <Suspense>
      <ComplianceClient data={getEnvironment()} module="environment" showApplies />
    </Suspense>
  );
}
