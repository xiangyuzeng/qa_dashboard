/** Regulatory & Recall Intelligence (surface 3) — federal/state feed over Sheet1 records.
 * Static: data read at build time; the `q` deep-link is read client-side (Suspense). */
import { Suspense } from "react";
import { getRegulatory } from "@/src/lib/data";
import { IntelligenceClient } from "@/src/components/intelligence/IntelligenceClient";

export default function IntelligencePage() {
  return (
    <Suspense>
      <IntelligenceClient data={getRegulatory()} />
    </Suspense>
  );
}
