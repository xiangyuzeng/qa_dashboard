/** QA Action Center (surface 7) — checklist, training focus, watch-list derived from reviewed data. */
import { getInspections } from "@/src/lib/data";
import { actionChecklist, trainingFocus, watchlist } from "@/src/lib/aggregate";
import { ActionsClient } from "@/src/components/actions/ActionsClient";

export default function ActionsPage() {
  const insp = getInspections();
  return (
    <ActionsClient
      checklist={actionChecklist(insp)}
      training={trainingFocus(insp)}
      watch={watchlist(insp)}
    />
  );
}
