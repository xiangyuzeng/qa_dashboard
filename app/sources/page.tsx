/** Data Sources & Coverage (surface 6 companion) — mirrors template Sheet6 + collection provenance. */
import { getJurisdictions, getMeta } from "@/src/lib/data";
import { SourcesClient } from "@/src/components/sources/SourcesClient";

export default function SourcesPage() {
  const { jurisdictions, alertRules } = getJurisdictions();
  return (
    <SourcesClient
      jurisdictions={jurisdictions}
      alertRules={alertRules}
      provenance={getMeta().provenance}
    />
  );
}
