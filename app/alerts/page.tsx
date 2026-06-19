/** Critical / High-Risk Alerts (surface 2) — records that fired a §10.1 trigger at prep,
 * now spanning all 4 alert types (food safety / import / state-local reg / inspection). */
import {
  getInspections,
  getRegulatory,
  getImportExport,
  getRegulations,
  getSentiment,
} from "@/src/lib/data";
import { buildAlertRows, alertsByTrigger, alertsByJurisdiction, alertsByType } from "@/src/lib/alerts";
import { AlertsClient } from "@/src/components/alerts/AlertsClient";

export default function AlertsPage() {
  const insp = getInspections();
  const reg = getRegulatory();
  const imp = getImportExport();
  const regs = getRegulations();
  const sent = getSentiment();
  const rows = buildAlertRows(insp, reg, imp, regs, sent);
  return (
    <AlertsClient
      rows={rows}
      byType={alertsByType(rows)}
      byTrigger={alertsByTrigger(insp, reg)}
      byJurisdiction={alertsByJurisdiction(insp)}
    />
  );
}
