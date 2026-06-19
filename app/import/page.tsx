/** Import / Export & Border Control (Module 2) — FDA/CBP/USDA actions over Sheet3 records.
 * Static: data read at build time; the `q` deep-link is read client-side (Suspense). */
import { Suspense } from "react";
import { getImportExport } from "@/src/lib/data";
import { importByAction } from "@/src/lib/aggregate";
import { ImportClient } from "@/src/components/import/ImportClient";

export default function ImportPage() {
  const data = getImportExport();
  return (
    <Suspense>
      <ImportClient data={data} byAction={importByAction(data)} />
    </Suspense>
  );
}
