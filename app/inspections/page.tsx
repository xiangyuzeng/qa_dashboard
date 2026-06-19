/** Inspection Results (surface 4) — faceted, searchable table over Sheet2 records.
 * Static: data read at build time; the `q` deep-link is read client-side (Suspense). */
import { Suspense } from "react";
import { getInspections, getViolationCategories } from "@/src/lib/data";
import { InspectionsClient } from "@/src/components/inspections/InspectionsClient";

export default function InspectionsPage() {
  const categories = getViolationCategories().map((c) => ({ id: c.id, zh: c.zh, en: c.en }));
  return (
    <Suspense>
      <InspectionsClient data={getInspections()} categories={categories} />
    </Suspense>
  );
}
