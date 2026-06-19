/** Inspection drill-down (surface 4 detail) — prerendered per id at build time. */
import { notFound } from "next/navigation";
import {
  getInspectionById,
  getInspectionIds,
  getCategoryById,
} from "@/src/lib/data";
import { DetailClient } from "@/src/components/inspections/DetailClient";

export function generateStaticParams() {
  return getInspectionIds().map((id) => ({ id }));
}

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = getInspectionById(id);
  if (!record) notFound();
  const category =
    record.standardizedCategoryId != null
      ? (getCategoryById(record.standardizedCategoryId) ?? null)
      : null;
  return <DetailClient record={record} category={category} />;
}
