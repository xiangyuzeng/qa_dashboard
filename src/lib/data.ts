/**
 * THE single data-access seam. Every page/aggregate reads /data through here, so a
 * future "go live" swap (JSON import → hosted DB query) touches only this file.
 *
 * Server-only by convention (imports the full dataset + zod). Pages that consume it
 * are server components that pass plain data down to client tables/charts.
 *
 * Validates at module load so a malformed prepared file fails `next build`
 * (the human-review gate stays meaningful), and serves reviewed (approved) records only.
 */
import {
  RegulatoryFileSchema,
  InspectionFileSchema,
  ImportExportFileSchema,
  RegulationFileSchema,
  SentimentFileSchema,
  ViolationCategoriesFileSchema,
  BrandsFileSchema,
  JurisdictionsFileSchema,
  MetaSchema,
  type RegulatoryRecord,
  type InspectionRecord,
  type ImportExportRecord,
  type RegulationRecord,
  type SentimentRecord,
  type ViolationCategory,
  type Meta,
} from "./schema";

import regulatoryJson from "@/data/v2/regulatory.json";
import inspectionsJson from "@/data/v2/inspections.json";
import importExportJson from "@/data/v2/import_export.json";
import regulationsJson from "@/data/v2/regulations.json";
import sentimentJson from "@/data/v2/sentiment.json";
import categoriesJson from "@/data/v2/violation_categories.json";
import brandsJson from "@/data/v2/brands.json";
import jurisdictionsJson from "@/data/v2/jurisdictions.json";
import metaJson from "@/data/v2/meta.json";

// Parse once at module load. Throws (fails the build) on malformed data.
const ALL_REGULATORY = RegulatoryFileSchema.parse(regulatoryJson);
const ALL_INSPECTIONS = InspectionFileSchema.parse(inspectionsJson);
const ALL_IMPORT = ImportExportFileSchema.parse(importExportJson);
const ALL_REGULATION = RegulationFileSchema.parse(regulationsJson);
const ALL_SENTIMENT = SentimentFileSchema.parse(sentimentJson);
const CATEGORIES = ViolationCategoriesFileSchema.parse(categoriesJson);
const BRANDS = BrandsFileSchema.parse(brandsJson);
const JURISDICTIONS = JurisdictionsFileSchema.parse(jurisdictionsJson);
const META = MetaSchema.parse(metaJson);

/** Reviewed = approved (or, for example/seed data, the reviewed flag). Export/serve these only. */
const isServable = (r: { reviewed: boolean; reviewStatus: string }) =>
  r.reviewed && r.reviewStatus !== "rejected";

export function getMeta(): Meta {
  return META;
}

export function getRegulatory(): RegulatoryRecord[] {
  return ALL_REGULATORY.filter(isServable);
}

export function getInspections(): InspectionRecord[] {
  return ALL_INSPECTIONS.filter(isServable);
}

export function getInspectionById(id: string): InspectionRecord | undefined {
  return getInspections().find((r) => r.id === id);
}

/** Module 2 — Import/Export & Border Control (servable only). */
export function getImportExport(): ImportExportRecord[] {
  return ALL_IMPORT.filter(isServable);
}

/** Module 3 — State & Local Regulation (servable only). */
export function getRegulations(): RegulationRecord[] {
  return ALL_REGULATION.filter(isServable);
}

/** Module 5 — Negative Media & Sentiment (servable, non-excluded). */
export function getSentiment(): SentimentRecord[] {
  return ALL_SENTIMENT.filter((r) => isServable(r) && !r.excluded);
}

export function getViolationCategories(): ViolationCategory[] {
  return CATEGORIES;
}

export function getCategoryById(id: number): ViolationCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getBrands() {
  return BRANDS;
}

export function getJurisdictions() {
  return JURISDICTIONS;
}

/** All inspection ids — for generateStaticParams on the drill-down route. */
export function getInspectionIds(): string[] {
  return getInspections().map((r) => r.id);
}
