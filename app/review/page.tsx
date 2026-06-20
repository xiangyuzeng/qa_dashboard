/** Manual Review Queue (spec §10) — hard-gate pending records (getPendingRecords) +
 * the soft criteria worklist over published high-stakes records (buildReviewQueue). */
import { getInspections, getPendingRecords } from "@/src/lib/data";
import { buildReviewQueue, sortQueue } from "@/src/lib/review";
import { ReviewClient } from "@/src/components/review/ReviewClient";

export default function ReviewPage() {
  const queue = sortQueue([...getPendingRecords(), ...buildReviewQueue(getInspections())]);
  return <ReviewClient queue={queue} />;
}
