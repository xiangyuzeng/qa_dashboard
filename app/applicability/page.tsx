/**
 * Applicability / Threshold Matrix (THE hero) — evaluates the real store footprint
 * against the scale-gated rules at build time, then hands the plain profile + rules
 * to the client so the "what-if" + Fair-Workweek basis toggle re-run the SAME pure
 * engine with no server round-trip (fully static). The `q` deep-link is read client-side.
 */
import { Suspense } from "react";
import { getCompanyProfile, getApplicabilityRules } from "@/src/lib/data";
import { evaluate } from "@/src/lib/applicability";
import { ApplicabilityClient } from "@/src/components/applicability/ApplicabilityClient";

export default function ApplicabilityPage() {
  const profile = getCompanyProfile();
  const rules = getApplicabilityRules();
  const initialVerdicts = evaluate(profile, rules);
  return (
    <Suspense>
      <ApplicabilityClient profile={profile} rules={rules} initialVerdicts={initialVerdicts} />
    </Suspense>
  );
}
