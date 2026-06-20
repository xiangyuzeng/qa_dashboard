/** Critical / High-Risk Alerts (surface 2) — records that fired a §10.1 trigger at prep,
 * now spanning all 4 alert types (food safety / import / state-local reg / inspection). */
import {
  getInspections,
  getRegulatory,
  getImportExport,
  getRegulations,
  getSentiment,
  getLabor,
  getBuilding,
  getEnvironment,
  getConsumer,
  getCompanyProfile,
  getApplicabilityRules,
} from "@/src/lib/data";
import { buildAlertRows, applicabilityAlertRows, alertsByTrigger, alertsByJurisdiction, alertsByType } from "@/src/lib/alerts";
import { evaluate } from "@/src/lib/applicability";
import { AlertsClient } from "@/src/components/alerts/AlertsClient";

export default function AlertsPage() {
  const insp = getInspections();
  const reg = getRegulatory();
  const imp = getImportExport();
  const regs = getRegulations();
  const sent = getSentiment();
  const applic = applicabilityAlertRows(evaluate(getCompanyProfile(), getApplicabilityRules()));
  const rows = buildAlertRows(insp, reg, imp, regs, sent, getLabor(), getBuilding(), getEnvironment(), getConsumer(), applic);
  return (
    <AlertsClient
      rows={rows}
      byType={alertsByType(rows)}
      byTrigger={alertsByTrigger(insp, reg)}
      byJurisdiction={alertsByJurisdiction(insp)}
    />
  );
}
