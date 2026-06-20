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
  LaborFileSchema,
  BuildingFileSchema,
  EnvironmentFileSchema,
  ConsumerFileSchema,
  OwnedStoresFileSchema,
  CompanyProfileSchema,
  ApplicabilityRulesFileSchema,
  ViolationCategoriesFileSchema,
  BrandsFileSchema,
  JurisdictionsFileSchema,
  MetaSchema,
  type RegulatoryRecord,
  type InspectionRecord,
  type ImportExportRecord,
  type RegulationRecord,
  type SentimentRecord,
  type LaborRecord,
  type BuildingRecord,
  type EnvironmentRecord,
  type ConsumerRecord,
  type OwnedStore,
  type CompanyProfile,
  type ApplicabilityRule,
  type ViolationCategory,
  type Meta,
} from "./schema";

import regulatoryJson from "@/data/v2/regulatory.json";
import inspectionsJson from "@/data/v2/inspections.json";
import importExportJson from "@/data/v2/import_export.json";
import regulationsJson from "@/data/v2/regulations.json";
import sentimentJson from "@/data/v2/sentiment.json";
import laborJson from "@/data/v2/labor.json";
import buildingJson from "@/data/v2/building.json";
import environmentJson from "@/data/v2/environment.json";
import consumerJson from "@/data/v2/consumer.json";
import ownedStoresJson from "@/data/v2/owned_stores.json";
import companyProfileJson from "@/data/v2/company_profile.json";
import applicabilityRulesJson from "@/data/v2/applicability_rules.json";
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
const ALL_LABOR = LaborFileSchema.parse(laborJson);
const ALL_BUILDING = BuildingFileSchema.parse(buildingJson);
const ALL_ENVIRONMENT = EnvironmentFileSchema.parse(environmentJson);
const ALL_CONSUMER = ConsumerFileSchema.parse(consumerJson);
// Footprint inputs — reference data for the engine, NOT servable findings.
const OWNED_STORES = OwnedStoresFileSchema.parse(ownedStoresJson);
const COMPANY_PROFILE = CompanyProfileSchema.parse(companyProfileJson);
const APPLICABILITY_RULES = ApplicabilityRulesFileSchema.parse(applicabilityRulesJson);
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

/** Module 6 — 用工合规 Labor & Employment (servable only). */
export function getLabor(): LaborRecord[] {
  return ALL_LABOR.filter(isServable);
}

/** Module 7 — 建筑与职业安全 Building & Occupational Safety (servable only). */
export function getBuilding(): BuildingRecord[] {
  return ALL_BUILDING.filter(isServable);
}

/** Module 8 — 环境卫生 Environmental & Sanitation (servable only). */
export function getEnvironment(): EnvironmentRecord[] {
  return ALL_ENVIRONMENT.filter(isServable);
}

/** Module 9 — 消费者与员工保护 Consumer & Worker Protection (servable only). */
export function getConsumer(): ConsumerRecord[] {
  return ALL_CONSUMER.filter(isServable);
}

/**
 * Footprint roster — the real ops-DB extract (asOf 2026-06-20). Returned WHOLE,
 * NOT servable-filtered: the roster is reviewed:false by design and is engine
 * *input* (the denominator rules are measured against), not a surfaced finding.
 * Zod-at-load still guards its shape. The UI surfaces an UNREVIEWED banner.
 */
export function getOwnedStores(): OwnedStore[] {
  return OWNED_STORES;
}

/** Company-level aggregates computed from the roster (engine input). */
export function getCompanyProfile(): CompanyProfile {
  return COMPANY_PROFILE;
}

/** Applicability / threshold rules (engine input). */
export function getApplicabilityRules(): ApplicabilityRule[] {
  return APPLICABILITY_RULES;
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
