/** Enforcement drill-down — full summons detail, with an outbound link to the NYC
 * government lookup (CityPay). Prerendered per id at build time. */
import { notFound } from "next/navigation";
import { getEnforcementById, getEnforcementIds } from "@/src/lib/data";
import { EnforcementDetailClient } from "@/src/components/enforcement/EnforcementDetailClient";

export function generateStaticParams() {
  return getEnforcementIds().map((id) => ({ id }));
}

export default async function EnforcementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getEnforcementById(id);
  if (!record) notFound();
  return <EnforcementDetailClient record={record} />;
}
