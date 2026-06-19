/**
 * QA Dashboard — canonical data contract (single source of truth).
 *
 * Shared by the one-time prep pipeline (writes /data) AND the Next.js app (reads /data).
 * Field names mirror templates/monthly_report.xlsx 1:1 so Excel export is a direct
 * write-back, and every enum string is copied VERBATIM from the workbook's `_lists`
 * sheet (do NOT normalize to the spec prose — the export dropdown validations depend
 * on exact matches, e.g. 'Washington DC', 'Florida (FDACS)', '其他 Other').
 *
 * Hard rules encoded here: never fabricate (unknown => null/empty), keep a source
 * ref per record, encode NJ/unavailable data truthfully via dataAvailability.
 */
import { z } from "zod";

/* ────────────────────────────────────────────────────────────────────────────
 * Enums — VERBATIM from templates/monthly_report.xlsx `_lists` sheet
 * ──────────────────────────────────────────────────────────────────────────── */

/** Sheet1 类别 Category (11) */
export const CategoryEnum = z.enum([
  "法规标准",
  "监管动态",
  "召回事件",
  "食品安全事件",
  "监督抽检",
  "DOH检查/扣分项",
  "负面舆情",
  "供应链风险",
  "标签/广告宣称风险",
  "进口合规风险",
  "其他",
]);

/** 风险等级 Risk Level (5) — adds 关注 Watch (V2 §7): no direct impact now but recurrence / worsening trend / escalation potential. */
export const RiskLevelEnum = z.enum(["高风险", "中风险", "低风险", "信息参考", "关注"]);

/** Sheet2 品牌 Brand (7) — priority brands + Other */
export const BrandEnum = z.enum([
  "Starbucks",
  "Dunkin",
  "Pret A Manger",
  "Blue Bottle Coffee",
  "McDonald's",
  "Luckin Coffee",
  "其他 Other",
]);

/** Sheet2 地区 Jurisdiction (9) — the Phase-I priority jurisdictions */
export const JurisdictionEnum = z.enum([
  "New York City",
  "Bergen County, NJ",
  "Newark, NJ",
  "Los Angeles County",
  "San Francisco",
  "Boston",
  "Cambridge",
  "Washington DC",
  "Florida (FDACS)",
]);

/** Sheet2 门店类型 Establishment Type (9) */
export const EstablishmentTypeEnum = z.enum([
  "咖啡馆 Coffee Shop",
  "咖啡连锁 Coffee Chain",
  "饮品店 Beverage Shop",
  "奶茶/果汁/Smoothie",
  "轻食咖啡 Café w/ Food",
  "烘焙咖啡 Bakery Café",
  "快餐竞品 QSR Competitor",
  "甲方门店 Owned Store",
  "供应商/仓储 Supplier·Warehouse",
]);

/** Sheet2 检查结果 Inspection Result (8) */
export const ResultEnum = z.enum([
  "Pass",
  "Conditional Pass",
  "Fail",
  "Closed",
  "Permit Suspended",
  "Stop Sale",
  "Re-inspection Required",
  "N/A",
]);

/** Sheet2 违规严重程度 Violation Severity (2) */
export const SeverityEnum = z.enum(["严重（主要）Critical", "一般 Non-critical"]);

/** Sheet2 是否需复查 Follow-up Required (2) */
export const FollowupEnum = z.enum(["是 Yes", "否 No"]);

/** Sheet2 数据来源方式 Source Type (5) */
export const SourceTypeEnum = z.enum([
  "Open Data API",
  "查询页 Web Lookup",
  "浏览器自动化 Browser Automation",
  "OPRA/人工 Manual Request",
  "PDF/HTML 报告",
]);

/** Sheet2 等级 Grade (5) */
export const GradeEnum = z.enum(["A", "B", "C", "Pending", "N/A"]);

/* ────────────────────────────────────────────────────────────────────────────
 * Enrichment vocabularies — derived at prep time (spec §11.2, §10.1, relevance)
 * ──────────────────────────────────────────────────────────────────────────── */

/** Relevance tags for regulatory items (spec §3 federal feed). */
export const RelevanceTagEnum = z.enum([
  "coffee",
  "dairy",
  "beverage",
  "additive",
  "allergen",
  "labeling",
  "packaging",
]);

/** Café-specific risk tags (spec §11.2) — closed set, mapped onto inspections. */
export const CafeRiskTagEnum = z.enum([
  "cold_milk_temp",
  "opened_shelf_life",
  "dairy_spoilage",
  "ice_machine",
  "beverage_equipment_lines",
  "blender_frother_coldbrew",
  "cross_contamination",
  "handwashing",
  "three_comp_sink_dishwasher",
  "pest",
  "light_food_heating_cold_shelf_life",
  "allergen_cross_contact",
  "date_marking",
]);

/** Human-review gate state. Only 'approved' (reviewed=true) is exported/served. */
export const ReviewStatusEnum = z.enum(["pending", "approved", "rejected"]);

/**
 * 3-state data availability — encodes NJ/manual gaps WITHOUT fabricating.
 * 'not_public_online' => show "Data not publicly available online / 未找到公开数据库".
 * Never use a missing record to imply "no inspection".
 */
export const DataAvailabilityEnum = z.enum([
  "available",
  "unknown",
  "not_public_online",
]);

export const AccessTypeEnum = z.enum([
  "official-api",
  "open-data",
  "bulk-download",
  "html-scrape",
  "none",
]);

/* ────────────────────────────────────────────────────────────────────────────
 * V2 — module taxonomy, alert types, new-module enums
 * ──────────────────────────────────────────────────────────────────────────── */

/** Top-level monitoring module (V2 6-module model). */
export const ModuleEnum = z.enum([
  "food_safety",
  "import",
  "regulation",
  "inspection",
  "sentiment",
]);

/** Alert type (V2 §8 — 4 alert types). */
export const AlertTypeEnum = z.enum([
  "food_safety",
  "import_compliance",
  "state_local_reg",
  "inspection",
]);

/** Pull-log status (V2 Sheet6 数据源日志) — bilingual labels resolved in UI/export. */
export const PullStatusEnum = z.enum([
  "fetched", // 已抓取
  "filtered", // 已筛选
  "no_update", // 未发现更新
  "manual", // 人工/manual
  "excluded", // 排除
]);

/** Import/Export regulatory action (Module 2). */
export const ImportActionEnum = z.enum([
  "Import Alert",
  "Import Refusal",
  "Detention",
  "Eligibility Change",
  "Tariff/AD-CVD",
  "Rule/Notice",
  "Prior Notice/FSVP",
  "Monitoring Baseline",
  "Other",
]);

/** State/local regulation lifecycle status (Module 3). */
export const RegStatusEnum = z.enum([
  "Proposed",
  "Passed",
  "In effect",
  "Pending effective",
  "Repealed",
  "Monitoring",
]);

/** Regulation topic tag (Module 3) — drives filtering + the compliance tracker. */
export const RegTopicEnum = z.enum([
  "menu_labeling",
  "added_sugar",
  "sodium",
  "allergen_disclosure",
  "food_additives",
  "pfas_packaging",
  "delivery_platform",
  "other",
]);

/** Regulation jurisdiction (Module 3) — superset of inspection jurisdictions + state/federal. */
export const RegJurisdictionEnum = z.enum([
  "Federal",
  "California",
  "New York State",
  "New York City",
  "New Jersey",
  "Massachusetts",
  "Washington DC",
  "Florida",
  "Other",
]);

/** Sentiment incident category (Module 5). */
export const SentimentCategoryEnum = z.enum([
  "negative_coverage",
  "consumer_complaint",
  "allergen_report",
  "foreign_object",
  "spoilage",
  "pest_report",
  "competitor_incident",
  "brand_reputation",
]);

/** Source credibility for sentiment items (low-credibility reposts excluded per §11). */
export const CredibilityEnum = z.enum(["high", "medium", "low"]);

/** Inspection risk tier (V2 3-tier per-jurisdiction model). */
export const RiskTierEnum = z.enum(["High", "Medium", "Low"]);

/* ────────────────────────────────────────────────────────────────────────────
 * Shared sub-objects
 * ──────────────────────────────────────────────────────────────────────────── */

/** ISO date 'YYYY-MM-DD' or null. Formatted to 'YYYY/MM/DD' on Excel export. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ProvenanceSchema = z.object({
  /** Stable key into meta.provenance / jurisdictions (e.g. 'nyc_dohmh', 'bergen_opra'). */
  sourceId: z.string().min(1),
  agency: z.string().nullable().default(null),
  /** Exactly one of sourceUrl/docRef is expected when dataAvailability='available'. */
  sourceUrl: z.string().url().nullable().default(null),
  docRef: z.string().nullable().default(null),
  collectedAt: z.string().datetime().nullable().default(null),
  /** §9 traceability — when the AI/heuristic summary was generated. */
  aiSummaryAt: z.string().datetime().nullable().default(null),
  dataAvailability: DataAvailabilityEnum.default("available"),
  dataAvailabilityLabel: z.string().nullable().default(null),
  /** NJ special handling (spec §11.1) — municipality routing for OPRA/manual. */
  njMunicipality: z.string().nullable().default(null),
  njRoutedTo: z.string().nullable().default(null),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

const ReviewMixin = {
  reviewed: z.boolean().default(false),
  reviewStatus: ReviewStatusEnum.default("pending"),
  reviewNote: z.string().nullable().default(null),
};

const AlertMixin = {
  alertTriggered: z.boolean().default(false),
  alertReason: z.string().nullable().default(null),
  alertRuleIds: z.array(z.string()).default([]),
};

/* ────────────────────────────────────────────────────────────────────────────
 * Sheet 1 — 食品安全信息月报-美国 (regulatory / recall feed, 12 cols)
 * ──────────────────────────────────────────────────────────────────────────── */

export const RegulatoryRecordSchema = z.object({
  /** stable id for deep-linking / dedupe (prep-assigned). */
  id: z.string().min(1),
  module: ModuleEnum.default("food_safety"),

  // ── verbatim Sheet1 columns (export writes these in this order) ──
  no: z.number().int().nullable().default(null), // 序号 No.
  category: CategoryEnum.nullable().default(null), // 类别 Category
  chineseTitle: z.string().nullable().default(null), // 中文标题
  englishTitle: z.string().nullable().default(null), // 英文标题
  source: z.string().nullable().default(null), // 来源 Source
  publicationDate: isoDate.nullable().default(null), // 发布日期
  chineseSummary: z.string().nullable().default(null), // 原文中文摘要
  englishSummary: z.string().nullable().default(null), // 英文摘要
  sourceUrl: z.string().url().nullable().default(null), // 原文链接 (required when available)
  riskLevel: RiskLevelEnum.nullable().default(null), // 风险等级
  relevanceNotes: z.string().nullable().default(null), // 相关性说明
  recommendedAction: z.string().nullable().default(null), // 建议行动

  // ── enrichment (derived at prep; inspectable at the review gate) ──
  relevanceTags: z.array(RelevanceTagEnum).default([]),
  ...AlertMixin,
  ...ReviewMixin,
  provenance: ProvenanceSchema,
});
export type RegulatoryRecord = z.infer<typeof RegulatoryRecordSchema>;

/** Ordered Sheet1 column keys → used by the Excel exporter (column order = this array). */
export const SHEET1_COLUMNS: (keyof RegulatoryRecord)[] = [
  "no",
  "category",
  "chineseTitle",
  "englishTitle",
  "source",
  "publicationDate",
  "chineseSummary",
  "englishSummary",
  "sourceUrl",
  "riskLevel",
  "relevanceNotes",
  "recommendedAction",
];

/* ────────────────────────────────────────────────────────────────────────────
 * Sheet 2 — 美国咖啡馆及重点品牌检查结果 (inspection results, 22 cols)
 * ──────────────────────────────────────────────────────────────────────────── */

export const InspectionRecordSchema = z.object({
  id: z.string().min(1),
  module: ModuleEnum.default("inspection"),

  // ── verbatim Sheet2 columns (export writes these in this order) ──
  no: z.number().int().nullable().default(null), // 序号 No.
  jurisdiction: JurisdictionEnum.nullable().default(null), // 地区 Jurisdiction
  regulatoryAgency: z.string().nullable().default(null), // 监管机构
  brand: BrandEnum.nullable().default(null), // 品牌 Brand
  establishmentType: EstablishmentTypeEnum.nullable().default(null), // 门店类型
  storeName: z.string().nullable().default(null), // 门店名称
  /** 门店编号 Establishment ID — NYC camis / Boston licenseno / facility id (V2; repeat-detection join key). */
  establishmentId: z.string().nullable().default(null),
  address: z.string().nullable().default(null), // 地址
  inspectionDate: isoDate.nullable().default(null), // 检查日期
  inspectionType: z.string().nullable().default(null), // 检查类型
  inspectionResult: ResultEnum.nullable().default(null), // 检查结果
  score: z.number().nullable().default(null), // 分数 (jurisdiction-relative meaning)
  grade: GradeEnum.nullable().default(null), // 等级
  violationCode: z.string().nullable().default(null), // 违规代码
  chineseViolationSummary: z.string().nullable().default(null), // 中文违规摘要
  englishViolationSummary: z.string().nullable().default(null), // 英文违规摘要
  violationSeverity: SeverityEnum.nullable().default(null), // 违规严重程度
  /** 标准化违规类别 — verbatim label e.g. "5 员工洗手和个人卫生" (or null). */
  standardizedCategory: z.string().nullable().default(null),
  followupRequired: FollowupEnum.nullable().default(null), // 是否需复查
  sourceType: SourceTypeEnum.nullable().default(null), // 数据来源方式
  riskLevel: RiskLevelEnum.nullable().default(null), // 风险等级
  sourceUrlOrDocRef: z.string().nullable().default(null), // 原文链接/文件编号
  recommendedAction: z.string().nullable().default(null), // 建议行动

  // ── enrichment (derived at prep) ──
  /** numeric id 1..19 of the primary standardized category (parsed from label). */
  standardizedCategoryId: z.number().int().min(1).max(19).nullable().default(null),
  /** all matched category ids (supports "multiple critical violations" alerts). */
  standardizedCategoriesAll: z.array(z.number().int().min(1).max(19)).default([]),
  cafeRiskTags: z.array(CafeRiskTagEnum).default([]),
  /** deterministic hash of normalizedBrand|areaKey|categoryId for repeat detection. */
  repeatViolationGroupId: z.string().nullable().default(null),
  ...AlertMixin,
  ...ReviewMixin,
  provenance: ProvenanceSchema,
});
export type InspectionRecord = z.infer<typeof InspectionRecordSchema>;

/** Ordered Sheet2 column keys → used by the Excel exporter. */
export const SHEET2_COLUMNS: (keyof InspectionRecord)[] = [
  "no",
  "jurisdiction",
  "regulatoryAgency",
  "brand",
  "establishmentType",
  "storeName",
  "establishmentId",
  "address",
  "inspectionDate",
  "inspectionType",
  "inspectionResult",
  "score",
  "grade",
  "violationCode",
  "chineseViolationSummary",
  "englishViolationSummary",
  "violationSeverity",
  "standardizedCategory",
  "followupRequired",
  "sourceType",
  "riskLevel",
  "sourceUrlOrDocRef",
  "recommendedAction",
];

/* ────────────────────────────────────────────────────────────────────────────
 * Sheet 3 — 进口出口监管 ImportExport (Module 2, 15 cols)
 * ──────────────────────────────────────────────────────────────────────────── */

export const ImportExportRecordSchema = z.object({
  id: z.string().min(1),
  module: ModuleEnum.default("import"),
  no: z.number().int().nullable().default(null), // 序号 No.
  category: z.string().nullable().default(null), // 类别 (free text, bilingual e.g. "进口限制 / 动物源产品 …")
  chineseTitle: z.string().nullable().default(null), // 中文标题
  englishTitle: z.string().nullable().default(null), // 英文标题
  agency: z.string().nullable().default(null), // 监管机构 CBP/FDA OII/USDA APHIS/USDA FSIS/Federal Register/USTR-DOC/EPA/CPSC
  countryRegion: z.string().nullable().default(null), // 涉及国家/地区
  productInvolved: z.string().nullable().default(null), // 涉及产品
  publicationDate: isoDate.nullable().default(null), // 发布日期
  regulatoryAction: ImportActionEnum.nullable().default(null), // 监管动作
  chineseSummary: z.string().nullable().default(null), // 中文摘要
  englishSummary: z.string().nullable().default(null), // 英文摘要
  importExportImpact: z.string().nullable().default(null), // 进口/出口影响
  documentationRequirement: z.string().nullable().default(null), // 文件要求
  riskLevel: RiskLevelEnum.nullable().default(null), // 风险等级
  sourceUrl: z.string().url().nullable().default(null), // 原文链接
  // ── enrichment ──
  relevanceTags: z.array(RelevanceTagEnum).default([]),
  ...AlertMixin,
  ...ReviewMixin,
  provenance: ProvenanceSchema,
});
export type ImportExportRecord = z.infer<typeof ImportExportRecordSchema>;

export const SHEET3_COLUMNS: (keyof ImportExportRecord)[] = [
  "no", "category", "chineseTitle", "englishTitle", "agency", "countryRegion",
  "productInvolved", "publicationDate", "regulatoryAction", "chineseSummary",
  "englishSummary", "importExportImpact", "documentationRequirement", "riskLevel", "sourceUrl",
];

/* ────────────────────────────────────────────────────────────────────────────
 * Sheet 4 — 州地方法规 StateLocalRegs (Module 3, 14 cols)
 * ──────────────────────────────────────────────────────────────────────────── */

export const RegulationRecordSchema = z.object({
  id: z.string().min(1),
  module: ModuleEnum.default("regulation"),
  no: z.number().int().nullable().default(null), // 序号 No.
  jurisdiction: RegJurisdictionEnum.nullable().default(null), // 地区
  regulationBillName: z.string().nullable().default(null), // 法规/法案名称
  chineseTitle: z.string().nullable().default(null), // 中文标题
  englishTitle: z.string().nullable().default(null), // 英文标题
  status: RegStatusEnum.nullable().default(null), // 当前状态
  publicationPassageDate: isoDate.nullable().default(null), // 发布/通过日期
  effectiveDate: isoDate.nullable().default(null), // 生效日期 (drives compliance-countdown)
  coveredEntities: z.string().nullable().default(null), // 适用对象
  keyRequirements: z.string().nullable().default(null), // 核心要求
  chineseSummary: z.string().nullable().default(null), // 中文摘要
  englishSummary: z.string().nullable().default(null), // 英文摘要
  businessImpact: z.string().nullable().default(null), // 对甲方影响
  riskLevel: RiskLevelEnum.nullable().default(null), // 风险等级
  sourceUrl: z.string().url().nullable().default(null), // 原文链接
  // ── enrichment ──
  topic: RegTopicEnum.nullable().default(null),
  ...AlertMixin,
  ...ReviewMixin,
  provenance: ProvenanceSchema,
});
export type RegulationRecord = z.infer<typeof RegulationRecordSchema>;

export const SHEET4_COLUMNS: (keyof RegulationRecord)[] = [
  "no", "jurisdiction", "regulationBillName", "chineseTitle", "englishTitle", "status",
  "publicationPassageDate", "effectiveDate", "coveredEntities", "keyRequirements",
  "chineseSummary", "englishSummary", "businessImpact", "riskLevel", "sourceUrl",
];

/* ────────────────────────────────────────────────────────────────────────────
 * Module 5 — 负面舆情 Negative Media & Sentiment (feeds Summary + /sentiment; no own export sheet)
 * ──────────────────────────────────────────────────────────────────────────── */

export const SentimentRecordSchema = z.object({
  id: z.string().min(1),
  module: ModuleEnum.default("sentiment"),
  no: z.number().int().nullable().default(null),
  sentimentCategory: SentimentCategoryEnum.nullable().default(null),
  chineseTitle: z.string().nullable().default(null),
  englishTitle: z.string().nullable().default(null),
  outlet: z.string().nullable().default(null), // media outlet / source name
  brandMentioned: BrandEnum.nullable().default(null),
  publicationDate: isoDate.nullable().default(null),
  chineseSummary: z.string().nullable().default(null),
  englishSummary: z.string().nullable().default(null),
  sourceUrl: z.string().url().nullable().default(null), // link only — never rehost article body
  riskLevel: RiskLevelEnum.nullable().default(null),
  credibility: CredibilityEnum.nullable().default(null),
  /** §11 exclusion — kept (not deleted) for audit; UI/export filter on it. */
  excluded: z.boolean().default(false),
  exclusionReason: z.string().nullable().default(null),
  relevanceTags: z.array(RelevanceTagEnum).default([]),
  ...AlertMixin,
  ...ReviewMixin,
  provenance: ProvenanceSchema,
});
export type SentimentRecord = z.infer<typeof SentimentRecordSchema>;

/* ────────────────────────────────────────────────────────────────────────────
 * Reference data (sheets 4–6) + meta
 * ──────────────────────────────────────────────────────────────────────────── */

export const ViolationCategorySchema = z.object({
  id: z.number().int().min(1).max(19),
  zh: z.string(),
  en: z.string(),
  cafeHighFrequency: z.boolean(), // ★ #17, #18
  note: z.string().nullable().default(null),
});
export type ViolationCategory = z.infer<typeof ViolationCategorySchema>;

export const BrandRefSchema = z.object({
  standard: BrandEnum,
  aliases: z.array(z.string()),
  type: z.string(), // 重点竞品 / 快餐竞品 / 甲方 Owned
});
export type BrandRef = z.infer<typeof BrandRefSchema>;

export const AlertRuleSchema = z.object({
  id: z.string(),
  scope: z.string(), // 'General' | jurisdiction label | 'Major hazards' | ...
  conditionZh: z.string(),
  conditionEn: z.string(),
});
export type AlertRule = z.infer<typeof AlertRuleSchema>;

export const JurisdictionRefSchema = z.object({
  region: z.string(),
  jurisdiction: JurisdictionEnum,
  dataSource: z.string(),
  accessType: AccessTypeEnum,
  accessMethod: z.string(),
  mainTargets: z.string(),
  /** verified dataset/endpoint pin (prevents the LA-2018 / Cambridge-dead-id traps). */
  endpointOrUrl: z.string().nullable().default(null),
  oneTimePullFeasible: z.enum(["yes", "partial", "no"]),
  stalenessNote: z.string().nullable().default(null),
  reVerifyBeforeRelying: z.boolean().default(false),
});
export type JurisdictionRef = z.infer<typeof JurisdictionRefSchema>;

export const SourceProvenanceSchema = z.object({
  sourceId: z.string(),
  name: z.string(),
  jurisdictionId: z.string().nullable().default(null),
  accessType: AccessTypeEnum,
  endpointOrUrl: z.string().nullable().default(null),
  oneTimePullFeasible: z.enum(["yes", "partial", "no"]),
  collectedAt: z.string().datetime().nullable().default(null),
  recordCount: z.number().int().default(0),
  stalenessNote: z.string().nullable().default(null),
  reVerifyBeforeRelying: z.boolean().default(false),
  // ── V2 pull-log (Sheet6 数据源日志) ──
  module: ModuleEnum.default("food_safety"),
  status: PullStatusEnum.default("manual"),
});
export type SourceProvenance = z.infer<typeof SourceProvenanceSchema>;

/* ────────────────────────────────────────────────────────────────────────────
 * V2 — Monthly Summary (Sheet1 月度摘要) embedded in meta
 * ──────────────────────────────────────────────────────────────────────────── */

const BilingualLineSchema = z.object({
  zh: z.string().nullable().default(null),
  en: z.string().nullable().default(null),
});

export const SummaryMetaSchema = z.object({
  reportNameZh: z.string(),
  reportNameEn: z.string(),
  scopeZh: z.string().nullable().default(null),
  scopeEn: z.string().nullable().default(null),
  exclusions: z.array(BilingualLineSchema).default([]),
  keyHighlights: z.array(BilingualLineSchema).default([]),
  highRiskItems: z
    .array(
      z.object({
        recordId: z.string(),
        module: ModuleEnum,
        titleZh: z.string().nullable().default(null),
        titleEn: z.string().nullable().default(null),
        riskLevel: RiskLevelEnum.nullable().default(null),
        href: z.string().nullable().default(null),
      }),
    )
    .default([]),
  keyActions: z.array(BilingualLineSchema).default([]),
});
export type SummaryMeta = z.infer<typeof SummaryMetaSchema>;

export const MetaSchema = z.object({
  schemaVersion: z.string(),
  /** ISO date the snapshot was finalized (powers the "data as of" tag). */
  dataAsOf: isoDate,
  reportingPeriod: z.object({
    label: z.string(),
    year: z.number().int(),
    month: z.number().int().min(1).max(12).nullable(),
  }),
  generatedAt: z.string().datetime(),
  /** true while shipping clearly-labeled example/seed data (pre real pull). */
  isSeedData: z.boolean().default(false),
  counts: z.object({
    regulatory: z.number().int(),
    inspections: z.number().int(),
    alerts: z.number().int(),
    pendingReview: z.number().int(),
    // ── V2 new-module counts (default 0 so v1 meta still validates) ──
    importExport: z.number().int().default(0),
    regulation: z.number().int().default(0),
    sentiment: z.number().int().default(0),
    highRisk: z.number().int().default(0),
    watch: z.number().int().default(0),
    bySource: z.record(z.string(), z.number().int()),
  }),
  /** V2 Monthly Summary (Sheet1). Optional so v1 meta.json still validates. */
  summary: SummaryMetaSchema.nullable().default(null),
  provenance: z.array(SourceProvenanceSchema),
});
export type Meta = z.infer<typeof MetaSchema>;

/* ────────────────────────────────────────────────────────────────────────────
 * Top-level dataset file schemas (one per /data/v2 file)
 * ──────────────────────────────────────────────────────────────────────────── */

export const RegulatoryFileSchema = z.array(RegulatoryRecordSchema);
export const InspectionFileSchema = z.array(InspectionRecordSchema);
export const ImportExportFileSchema = z.array(ImportExportRecordSchema);
export const RegulationFileSchema = z.array(RegulationRecordSchema);
export const SentimentFileSchema = z.array(SentimentRecordSchema);
export const ViolationCategoriesFileSchema = z.array(ViolationCategorySchema);
export const BrandsFileSchema = z.object({
  brands: z.array(BrandRefSchema),
  cafeKeywords: z.array(z.string()),
});
export const JurisdictionsFileSchema = z.object({
  jurisdictions: z.array(JurisdictionRefSchema),
  alertRules: z.array(AlertRuleSchema),
});

/** Convenience: enum option arrays for filter UIs (single source of truth). */
export const ENUM_OPTIONS = {
  category: CategoryEnum.options,
  riskLevel: RiskLevelEnum.options,
  brand: BrandEnum.options,
  jurisdiction: JurisdictionEnum.options,
  establishmentType: EstablishmentTypeEnum.options,
  result: ResultEnum.options,
  severity: SeverityEnum.options,
  followup: FollowupEnum.options,
  sourceType: SourceTypeEnum.options,
  grade: GradeEnum.options,
  relevanceTag: RelevanceTagEnum.options,
  cafeRiskTag: CafeRiskTagEnum.options,
  // ── V2 ──
  module: ModuleEnum.options,
  alertType: AlertTypeEnum.options,
  importAction: ImportActionEnum.options,
  regStatus: RegStatusEnum.options,
  regTopic: RegTopicEnum.options,
  regJurisdiction: RegJurisdictionEnum.options,
  sentimentCategory: SentimentCategoryEnum.options,
} as const;
