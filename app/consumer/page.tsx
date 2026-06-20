/** Module 9 — 消费者与员工保护 Consumer & Worker Protection. Servable records + engine-stamped appliesToUs. */
import { Suspense } from "react";
import { getConsumer } from "@/src/lib/data";
import { ComplianceClient } from "@/src/components/compliance/ComplianceClient";

export default function ConsumerPage() {
  return (
    <Suspense>
      <ComplianceClient data={getConsumer()} module="consumer" showApplies />
    </Suspense>
  );
}
