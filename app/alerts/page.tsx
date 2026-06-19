/** Critical / High-Risk Alerts (surface 2) — records that fired a §10.1 trigger at prep. */
import { getInspections, getRegulatory } from "@/src/lib/data";
import { buildAlertRows, alertsByTrigger, alertsByJurisdiction } from "@/src/lib/alerts";
import { AlertsClient } from "@/src/components/alerts/AlertsClient";

export default function AlertsPage() {
  const insp = getInspections();
  const reg = getRegulatory();
  return (
    <AlertsClient
      rows={buildAlertRows(insp, reg)}
      byTrigger={alertsByTrigger(insp, reg)}
      byJurisdiction={alertsByJurisdiction(insp)}
    />
  );
}
