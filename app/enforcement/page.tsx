/** Enforcement & Penalties — real summonses/violations issued to us, pulled from the domain
 * files by provenance (DSNY/DOB/DCWP) and shown separately from regulations. */
import { Suspense } from "react";
import { getEnforcement } from "@/src/lib/data";
import { EnforcementClient } from "@/src/components/enforcement/EnforcementClient";

// Re-render daily so relative dates stay fresh (parallels the domain module pages).
export const revalidate = 86400;

export default function EnforcementPage() {
  return (
    <Suspense>
      <EnforcementClient data={getEnforcement()} />
    </Suspense>
  );
}
