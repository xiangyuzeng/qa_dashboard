/**
 * Seed generator — emits CLEARLY-LABELED EXAMPLE data so the dashboard + Excel export
 * can be built and verified before the real one-time pull (P1) lands.
 *
 * These are NOT real inspection results. meta.isSeedData=true drives a prominent
 * "EXAMPLE DATA" banner in the app, and provenance.sourceId='seed_example'. The real
 * collectors in prep/ overwrite these files with reviewed, sourced records.
 *
 * Run: npm run prep:build  (alias) / tsx prep/seed.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  InspectionRecord,
  RegulatoryRecord,
  Meta,
} from "../src/lib/schema";
import categories from "../data/v2/violation_categories.json";

const OUT = join(process.cwd(), "data", "v2");
const SEED_TS = "2026-06-18T00:00:00.000Z";
const catLabel = (id: number) => {
  const c = categories.find((x) => x.id === id)!;
  return `${id} ${c.zh}`;
};

function reg(p: Partial<RegulatoryRecord> & { id: string }): RegulatoryRecord {
  return {
    id: p.id,
    no: p.no ?? null,
    category: p.category ?? null,
    chineseTitle: p.chineseTitle ?? null,
    englishTitle: p.englishTitle ?? null,
    source: p.source ?? null,
    publicationDate: p.publicationDate ?? null,
    chineseSummary: p.chineseSummary ?? null,
    englishSummary: p.englishSummary ?? null,
    sourceUrl: p.sourceUrl ?? null,
    riskLevel: p.riskLevel ?? null,
    relevanceNotes: p.relevanceNotes ?? null,
    recommendedAction: p.recommendedAction ?? null,
    relevanceTags: p.relevanceTags ?? [],
    alertTriggered: p.alertTriggered ?? false,
    alertReason: p.alertReason ?? null,
    alertRuleIds: p.alertRuleIds ?? [],
    reviewed: p.reviewed ?? true,
    reviewStatus: p.reviewStatus ?? "approved",
    reviewNote: p.reviewNote ?? null,
    provenance: p.provenance ?? {
      sourceId: "seed_example",
      agency: null,
      sourceUrl: p.sourceUrl ?? null,
      docRef: null,
      collectedAt: SEED_TS,
      dataAvailability: "available",
      dataAvailabilityLabel: null,
      njMunicipality: null,
      njRoutedTo: null,
    },
  };
}

function ins(p: Partial<InspectionRecord> & { id: string }): InspectionRecord {
  return {
    id: p.id,
    no: p.no ?? null,
    jurisdiction: p.jurisdiction ?? null,
    regulatoryAgency: p.regulatoryAgency ?? null,
    brand: p.brand ?? null,
    establishmentType: p.establishmentType ?? null,
    storeName: p.storeName ?? null,
    address: p.address ?? null,
    inspectionDate: p.inspectionDate ?? null,
    inspectionType: p.inspectionType ?? null,
    inspectionResult: p.inspectionResult ?? null,
    score: p.score ?? null,
    grade: p.grade ?? null,
    violationCode: p.violationCode ?? null,
    chineseViolationSummary: p.chineseViolationSummary ?? null,
    englishViolationSummary: p.englishViolationSummary ?? null,
    violationSeverity: p.violationSeverity ?? null,
    standardizedCategory: p.standardizedCategory ?? null,
    followupRequired: p.followupRequired ?? null,
    sourceType: p.sourceType ?? null,
    riskLevel: p.riskLevel ?? null,
    sourceUrlOrDocRef: p.sourceUrlOrDocRef ?? null,
    recommendedAction: p.recommendedAction ?? null,
    standardizedCategoryId: p.standardizedCategoryId ?? null,
    standardizedCategoriesAll: p.standardizedCategoriesAll ?? [],
    cafeRiskTags: p.cafeRiskTags ?? [],
    repeatViolationGroupId: p.repeatViolationGroupId ?? null,
    alertTriggered: p.alertTriggered ?? false,
    alertReason: p.alertReason ?? null,
    alertRuleIds: p.alertRuleIds ?? [],
    reviewed: p.reviewed ?? true,
    reviewStatus: p.reviewStatus ?? "approved",
    reviewNote: p.reviewNote ?? null,
    provenance: p.provenance ?? {
      sourceId: "seed_example",
      agency: p.regulatoryAgency ?? null,
      sourceUrl: null,
      docRef: null,
      collectedAt: SEED_TS,
      dataAvailability: "available",
      dataAvailabilityLabel: null,
      njMunicipality: null,
      njRoutedTo: null,
    },
  };
}

const njProv = (muni: string, routedTo: string) => ({
  sourceId: "seed_example",
  agency: null,
  sourceUrl: null,
  docRef: null,
  collectedAt: SEED_TS,
  dataAvailability: "not_public_online" as const,
  dataAvailabilityLabel: "Data not publicly available online / 未找到公开数据库",
  njMunicipality: muni,
  njRoutedTo: routedTo,
});

const regulatory: RegulatoryRecord[] = [
  reg({
    id: "reg-0001", no: 1, category: "法规标准",
    chineseTitle: "（示例）美国发布《2025-2030年美国膳食指南》",
    englishTitle: "(EXAMPLE) 2025–2030 Dietary Guidelines for Americans Released",
    source: "HHS / USDA", publicationDate: "2026-01-07",
    chineseSummary: "（示例）强调优先全脂乳制品、优质蛋白、蔬果与全谷物，显著减少高加工食品与添加糖。",
    englishSummary: "(EXAMPLE) Emphasizes whole-fat dairy, quality protein, produce and whole grains; cuts ultra-processed foods and added sugars.",
    sourceUrl: "https://www.hhs.gov/", riskLevel: "信息参考",
    relevanceNotes: "关注全脂乳制品表述对乳基饮品定位的影响", recommendedAction: "跟踪后续指南落地；评估对乳基饮品营销话术的影响",
    relevanceTags: ["dairy", "labeling"],
  }),
  reg({
    id: "reg-0002", no: 2, category: "监管动态",
    chineseTitle: "（示例）FDA对某即食/烘焙工厂发布警告信（李斯特菌）",
    englishTitle: "(EXAMPLE) FDA Warning Letter to an RTE/Bakery Plant (Listeria)",
    source: "FDA", publicationDate: "2026-03-03",
    chineseSummary: "（示例）环境样本检出单增李斯特菌，违反CGMP及预防性控制法规，企业停产深度清洁并销毁产品。",
    englishSummary: "(EXAMPLE) L. monocytogenes in environmental samples; CGMP & Preventive Controls violations; firm halted production and destroyed product.",
    sourceUrl: "https://www.fda.gov/", riskLevel: "中风险",
    relevanceNotes: "涉及即食/烘焙供应链李斯特菌污染风险", recommendedAction: "核查是否涉及甲方烘焙类供应商；必要时索取整改证明",
    relevanceTags: ["allergen", "dairy"], alertTriggered: false,
  }),
  reg({
    id: "reg-0003", no: 3, category: "召回事件",
    chineseTitle: "（示例）某品牌冷藏燕麦奶因标签缺失过敏原召回",
    englishTitle: "(EXAMPLE) Oat-Milk Recall for Undeclared Allergen",
    source: "FDA", publicationDate: "2026-04-12",
    chineseSummary: "（示例）产品未在标签声明坚果过敏原，发起自愿召回。",
    englishSummary: "(EXAMPLE) Voluntary recall — undeclared tree-nut allergen on label.",
    sourceUrl: "https://www.fda.gov/", riskLevel: "高风险",
    relevanceNotes: "涉及乳基替代品/过敏原标签，直接关联饮品原料", recommendedAction: "立即核对门店在用植物奶品牌与批次；下架排查",
    relevanceTags: ["dairy", "allergen", "beverage", "labeling"],
    alertTriggered: true, alertReason: "高风险召回，涉及饮品原料过敏原标签", alertRuleIds: ["general.closed"],
  }),
  reg({
    id: "reg-0004", no: 4, category: "食品安全事件",
    chineseTitle: "（示例）CDC通报多州沙门氏菌暴发与饮品冰块关联调查",
    englishTitle: "(EXAMPLE) CDC Multistate Salmonella Outbreak — Beverage Ice Under Investigation",
    source: "CDC", publicationDate: "2026-02-20",
    chineseSummary: "（示例）多州病例与某连锁饮品冰块疑似关联，调查进行中。",
    englishSummary: "(EXAMPLE) Multistate cases tentatively linked to chain beverage ice; investigation ongoing.",
    sourceUrl: "https://www.cdc.gov/", riskLevel: "高风险",
    relevanceNotes: "直接关联冰机/制冰卫生（标准化类别17）", recommendedAction: "加强制冰机清洁消毒自查；保留清洁记录",
    relevanceTags: ["beverage", "coffee"], alertTriggered: true, alertReason: "高风险食源性疾病暴发，关联冰机卫生", alertRuleIds: ["hazard.major"],
  }),
  reg({
    id: "reg-0005", no: 5, category: "标签/广告宣称风险",
    chineseTitle: "（示例）联邦公报：拟修订咖啡因含量标签指南",
    englishTitle: "(EXAMPLE) Federal Register: Proposed Caffeine-Labeling Guidance",
    source: "Federal Register", publicationDate: "2026-05-01",
    chineseSummary: "（示例）就含咖啡因饮品的标签披露征求意见。",
    englishSummary: "(EXAMPLE) Request for comment on caffeine disclosure for caffeinated beverages.",
    sourceUrl: "https://www.federalregister.gov/", riskLevel: "低风险",
    relevanceNotes: "影响含咖啡因饮品标签合规", recommendedAction: "评估现有产品标签；准备意见反馈",
    relevanceTags: ["beverage", "labeling", "additive"],
  }),
  reg({
    id: "reg-0006", no: 6, category: "供应链风险",
    chineseTitle: "（示例）USDA/FSIS通报某乳制品配料供应商召回",
    englishTitle: "(EXAMPLE) USDA/FSIS Notice — Dairy Ingredient Supplier Recall",
    source: "USDA / FSIS", publicationDate: "2026-03-28",
    chineseSummary: "（示例）某乳基配料因微生物污染召回，涉及多家下游餐饮。",
    englishSummary: "(EXAMPLE) Dairy-based ingredient recalled for microbial contamination; affects multiple downstream foodservice buyers.",
    sourceUrl: "https://www.fsis.usda.gov/", riskLevel: "中风险",
    relevanceNotes: "涉及乳基配料供应链", recommendedAction: "核查供应商清单与批次；评估替代供应",
    relevanceTags: ["dairy"],
  }),
];

const inspections: InspectionRecord[] = [
  ins({ id: "insp-0001", no: 1, jurisdiction: "New York City", regulatoryAgency: "NYC DOHMH", brand: "Starbucks", establishmentType: "咖啡连锁 Coffee Chain", storeName: "STARBUCKS #1100 (示例)", address: "Manhattan, NY", inspectionDate: "2026-05-12", inspectionType: "Routine", inspectionResult: "Pass", score: 12, grade: "A", violationSeverity: "一般 Non-critical", standardizedCategory: catLabel(5), standardizedCategoryId: 5, standardizedCategoriesAll: [5], followupRequired: "否 No", sourceType: "Open Data API", riskLevel: "低风险", sourceUrlOrDocRef: "https://data.cityofnewyork.us/resource/43nn-pn8j.json", recommendedAction: "对照甲方门店自查清单核对洗手项" }),
  ins({ id: "insp-0002", no: 2, jurisdiction: "New York City", regulatoryAgency: "NYC DOHMH", brand: "Luckin Coffee", establishmentType: "甲方门店 Owned Store", storeName: "LUCKIN COFFEE NYC-01 (示例)", address: "Flushing, Queens, NY", inspectionDate: "2026-05-18", inspectionType: "Routine", inspectionResult: "Conditional Pass", score: 28, grade: "Pending", violationCode: "10F", chineseViolationSummary: "（示例）冷藏牛奶温度高于41°F；开封奶基原料未标效期。", englishViolationSummary: "(EXAMPLE) Refrigerated milk above 41°F; opened dairy base lacking date marking.", violationSeverity: "严重（主要）Critical", standardizedCategory: catLabel(18), standardizedCategoryId: 18, standardizedCategoriesAll: [18, 1], cafeRiskTags: ["cold_milk_temp", "dairy_spoilage", "date_marking"], followupRequired: "是 Yes", sourceType: "Open Data API", riskLevel: "高风险", sourceUrlOrDocRef: "https://data.cityofnewyork.us/resource/43nn-pn8j.json", recommendedAction: "立即复核冷藏链与效期标识；安排复查", alertTriggered: true, alertReason: "NYC Score 28 ≥ 28 / Grade Pending", alertRuleIds: ["nyc.score"] }),
  ins({ id: "insp-0003", no: 3, jurisdiction: "New York City", regulatoryAgency: "NYC DOHMH", brand: "Dunkin", establishmentType: "咖啡连锁 Coffee Chain", storeName: "DUNKIN #220 (示例)", address: "Brooklyn, NY", inspectionDate: "2026-04-30", inspectionType: "Re-inspection", inspectionResult: "Fail", score: 33, grade: "C", chineseViolationSummary: "（示例）发现鼠类活动迹象。", englishViolationSummary: "(EXAMPLE) Evidence of mouse activity observed.", violationSeverity: "严重（主要）Critical", standardizedCategory: catLabel(10), standardizedCategoryId: 10, standardizedCategoriesAll: [10], cafeRiskTags: ["pest"], followupRequired: "是 Yes", sourceType: "Open Data API", riskLevel: "高风险", sourceUrlOrDocRef: "https://data.cityofnewyork.us/resource/43nn-pn8j.json", recommendedAction: "竞品高风险参考；强化自查虫害控制", alertTriggered: true, alertReason: "NYC Score 33 ≥ 28 / Grade C", alertRuleIds: ["nyc.score", "hazard.major"] }),
  ins({ id: "insp-0004", no: 4, jurisdiction: "Los Angeles County", regulatoryAgency: "LA County Environmental Health", brand: "Starbucks", establishmentType: "咖啡连锁 Coffee Chain", storeName: "STARBUCKS #8780 (示例)", address: "Huntington Park, CA", inspectionDate: "2026-05-02", inspectionType: "Routine", inspectionResult: "Fail", score: 78, grade: "C", chineseViolationSummary: "（示例）制冰机内部霉斑；咖啡机奶管清洁不到位。", englishViolationSummary: "(EXAMPLE) Mold in ice machine; coffee-machine milk lines inadequately cleaned.", violationSeverity: "严重（主要）Critical", standardizedCategory: catLabel(17), standardizedCategoryId: 17, standardizedCategoriesAll: [17, 7], cafeRiskTags: ["ice_machine", "beverage_equipment_lines"], followupRequired: "是 Yes", sourceType: "Open Data API", riskLevel: "高风险", sourceUrlOrDocRef: "https://lacounty.maps.arcgis.com/", recommendedAction: "对照自查清单核查冰机与奶管清洁消毒", alertTriggered: true, alertReason: "LA County Grade C / Score 78 < 80", alertRuleIds: ["la.grade"], repeatViolationGroupId: "rg-la-starbucks-17" }),
  ins({ id: "insp-0005", no: 5, jurisdiction: "Los Angeles County", regulatoryAgency: "LA County Environmental Health", brand: "Starbucks", establishmentType: "咖啡连锁 Coffee Chain", storeName: "STARBUCKS #4521 (示例)", address: "Downtown LA, CA", inspectionDate: "2026-03-15", inspectionType: "Routine", inspectionResult: "Conditional Pass", score: 84, grade: "B", chineseViolationSummary: "（示例）制冰机除垢记录缺失。", englishViolationSummary: "(EXAMPLE) Missing ice-machine descaling records.", violationSeverity: "一般 Non-critical", standardizedCategory: catLabel(17), standardizedCategoryId: 17, standardizedCategoriesAll: [17], cafeRiskTags: ["ice_machine"], followupRequired: "否 No", sourceType: "Open Data API", riskLevel: "中风险", sourceUrlOrDocRef: "https://lacounty.maps.arcgis.com/", recommendedAction: "同品牌同区域重复冰机问题，纳入观察", repeatViolationGroupId: "rg-la-starbucks-17" }),
  ins({ id: "insp-0006", no: 6, jurisdiction: "Los Angeles County", regulatoryAgency: "LA County Environmental Health", brand: "Luckin Coffee", establishmentType: "甲方门店 Owned Store", storeName: "LUCKIN COFFEE LA-02 (示例)", address: "Arcadia, CA", inspectionDate: "2026-05-20", inspectionType: "Routine", inspectionResult: "Conditional Pass", score: 88, grade: "B", chineseViolationSummary: "（示例）糖浆管路清洁记录不完整。", englishViolationSummary: "(EXAMPLE) Incomplete syrup-line cleaning logs.", violationSeverity: "一般 Non-critical", standardizedCategory: catLabel(17), standardizedCategoryId: 17, standardizedCategoriesAll: [17], cafeRiskTags: ["beverage_equipment_lines"], followupRequired: "否 No", sourceType: "Open Data API", riskLevel: "中风险", sourceUrlOrDocRef: "https://lacounty.maps.arcgis.com/", recommendedAction: "完善糖浆/奶管清洁记录" }),
  ins({ id: "insp-0007", no: 7, jurisdiction: "San Francisco", regulatoryAgency: "SF DPH", brand: "Pret A Manger", establishmentType: "轻食咖啡 Café w/ Food", storeName: "PRET A MANGER SF (示例)", address: "Financial District, SF, CA", inspectionDate: "2026-04-18", inspectionType: "Routine", inspectionResult: "Conditional Pass", grade: "N/A", chineseViolationSummary: "（示例）生熟食材分隔不当。", englishViolationSummary: "(EXAMPLE) Improper separation of raw and ready-to-eat foods.", violationSeverity: "严重（主要）Critical", standardizedCategory: catLabel(6), standardizedCategoryId: 6, standardizedCategoriesAll: [6], cafeRiskTags: ["cross_contamination"], followupRequired: "是 Yes", sourceType: "查询页 Web Lookup", riskLevel: "高风险", sourceUrlOrDocRef: "https://data.sfgov.org/resource/pyih-qa8i.json", recommendedAction: "竞品参考；强化生熟分隔", alertTriggered: true, alertReason: "San Francisco Conditional Pass", alertRuleIds: ["sf.result"] }),
  ins({ id: "insp-0008", no: 8, jurisdiction: "Boston", regulatoryAgency: "Boston Inspectional Services", brand: "McDonald's", establishmentType: "快餐竞品 QSR Competitor", storeName: "MCDONALD'S Boston-12 (示例)", address: "Back Bay, Boston, MA", inspectionDate: "2026-05-09", inspectionType: "Routine", inspectionResult: "Pass", chineseViolationSummary: "（示例）垃圾区清洁良好，无重大问题。", englishViolationSummary: "(EXAMPLE) Waste area clean; no major issues.", violationSeverity: "一般 Non-critical", standardizedCategory: catLabel(13), standardizedCategoryId: 13, standardizedCategoriesAll: [13], followupRequired: "否 No", sourceType: "Open Data API", riskLevel: "低风险", sourceUrlOrDocRef: "https://data.boston.gov/", recommendedAction: "—" }),
  ins({ id: "insp-0009", no: 9, jurisdiction: "Boston", regulatoryAgency: "Boston Inspectional Services", brand: "Luckin Coffee", establishmentType: "甲方门店 Owned Store", storeName: "LUCKIN COFFEE BOS-01 (示例)", address: "Chinatown, Boston, MA", inspectionDate: "2026-05-22", inspectionType: "Complaint", inspectionResult: "Permit Suspended", chineseViolationSummary: "（示例）污水倒流污染备餐区。", englishViolationSummary: "(EXAMPLE) Sewage backflow contaminating prep area.", violationSeverity: "严重（主要）Critical", standardizedCategory: catLabel(11), standardizedCategoryId: 11, standardizedCategoriesAll: [11], followupRequired: "是 Yes", sourceType: "Open Data API", riskLevel: "高风险", sourceUrlOrDocRef: "https://data.boston.gov/", recommendedAction: "立即停业整改；排查管道回流装置", alertTriggered: true, alertReason: "Boston Permit Suspension + 污水倒流", alertRuleIds: ["bos.cam", "general.closed", "hazard.major"] }),
  ins({ id: "insp-0010", no: 10, jurisdiction: "Cambridge", regulatoryAgency: "Cambridge Inspectional Services", brand: "Starbucks", establishmentType: "咖啡连锁 Coffee Chain", storeName: "STARBUCKS Cambridge-3 (示例)", address: "Harvard Sq, Cambridge, MA", inspectionDate: "2026-04-25", inspectionType: "Routine", inspectionResult: "Pass", chineseViolationSummary: "（示例）食品储存符合要求。", englishViolationSummary: "(EXAMPLE) Food storage compliant.", violationSeverity: "一般 Non-critical", standardizedCategory: catLabel(8), standardizedCategoryId: 8, standardizedCategoriesAll: [8], followupRequired: "否 No", sourceType: "Open Data API", riskLevel: "低风险", sourceUrlOrDocRef: "https://data.cambridgema.gov/resource/ryb9-qzmw.json", recommendedAction: "—" }),
  ins({ id: "insp-0011", no: 11, jurisdiction: "Cambridge", regulatoryAgency: "Cambridge Inspectional Services", brand: "Blue Bottle Coffee", establishmentType: "烘焙咖啡 Bakery Café", storeName: "BLUE BOTTLE Cambridge (示例)", address: "Kendall Sq, Cambridge, MA", inspectionDate: "2026-05-06", inspectionType: "Routine", inspectionResult: "Conditional Pass", chineseViolationSummary: "（示例）热饮保温低于135°F。", englishViolationSummary: "(EXAMPLE) Hot beverage held below 135°F.", violationSeverity: "一般 Non-critical", standardizedCategory: catLabel(2), standardizedCategoryId: 2, standardizedCategoriesAll: [2], followupRequired: "否 No", sourceType: "Open Data API", riskLevel: "中风险", sourceUrlOrDocRef: "https://data.cambridgema.gov/resource/ryb9-qzmw.json", recommendedAction: "校准保温设备" }),
  ins({ id: "insp-0012", no: 12, jurisdiction: "Washington DC", regulatoryAgency: "DC Health", brand: "Dunkin", establishmentType: "咖啡连锁 Coffee Chain", storeName: "DUNKIN DC-7 (示例)", address: "NW, Washington, DC", inspectionDate: "2026-05-14", inspectionType: "Routine", inspectionResult: "Fail", chineseViolationSummary: "（示例）多项优先级违规：交叉污染与洗手设施。", englishViolationSummary: "(EXAMPLE) Multiple priority violations: cross-contamination and handwashing.", violationSeverity: "严重（主要）Critical", standardizedCategory: catLabel(6), standardizedCategoryId: 6, standardizedCategoriesAll: [6, 5], cafeRiskTags: ["cross_contamination", "handwashing"], followupRequired: "是 Yes", sourceType: "PDF/HTML 报告", riskLevel: "高风险", sourceUrlOrDocRef: "https://dc.healthinspections.us/", recommendedAction: "竞品高风险参考；自查洗手与交叉污染", alertTriggered: true, alertReason: "DC Fail / multiple Priority Violations", alertRuleIds: ["dc.fail"] }),
  ins({ id: "insp-0013", no: 13, jurisdiction: "Washington DC", regulatoryAgency: "DC Health", brand: "Starbucks", establishmentType: "咖啡连锁 Coffee Chain", storeName: "STARBUCKS DC-2 (示例)", address: "Georgetown, Washington, DC", inspectionDate: "2026-04-10", inspectionType: "Routine", inspectionResult: "Pass", standardizedCategory: catLabel(14), standardizedCategoryId: 14, standardizedCategoriesAll: [14], violationSeverity: "一般 Non-critical", followupRequired: "否 No", sourceType: "PDF/HTML 报告", riskLevel: "低风险", sourceUrlOrDocRef: "https://dc.healthinspections.us/", recommendedAction: "—" }),
  ins({ id: "insp-0014", no: 14, jurisdiction: "Newark, NJ", regulatoryAgency: "Newark Dept. of Health & Community Wellness", brand: "Luckin Coffee", establishmentType: "甲方门店 Owned Store", storeName: "LUCKIN COFFEE NJ-01 (示例)", address: "Newark, NJ", inspectionType: "—", sourceType: "OPRA/人工 Manual Request", sourceUrlOrDocRef: "OPRA Request #PENDING", recommendedAction: "提交OPRA请求；线上数据库不可用，不得记为‘无检查’", provenance: njProv("Newark", "Newark Food & Drug Bureau") }),
  ins({ id: "insp-0015", no: 15, jurisdiction: "Bergen County, NJ", regulatoryAgency: "NWBRHC", brand: "Starbucks", establishmentType: "咖啡连锁 Coffee Chain", storeName: "STARBUCKS Paramus (示例)", address: "Paramus, NJ", inspectionType: "—", sourceType: "OPRA/人工 Manual Request", sourceUrlOrDocRef: "OPRA Request #PENDING", recommendedAction: "按市镇路由提交OPRA；无统一数据库", provenance: njProv("Paramus", "Northwest Bergen Regional Health Commission") }),
  ins({ id: "insp-0016", no: 16, jurisdiction: "Florida (FDACS)", regulatoryAgency: "FDACS", brand: "McDonald's", establishmentType: "快餐竞品 QSR Competitor", storeName: "MCDONALD'S FL-30 (示例)", address: "Orlando, FL", inspectionDate: "2026-05-03", inspectionType: "Routine", inspectionResult: "Stop Sale", chineseViolationSummary: "（示例）冷藏乳品温度失控，发出停售。", englishViolationSummary: "(EXAMPLE) Cold-held dairy out of temperature; Stop Sale issued.", violationSeverity: "严重（主要）Critical", standardizedCategory: catLabel(1), standardizedCategoryId: 1, standardizedCategoriesAll: [1, 18], cafeRiskTags: ["cold_milk_temp"], followupRequired: "是 Yes", sourceType: "查询页 Web Lookup", riskLevel: "高风险", sourceUrlOrDocRef: "https://foodpermit.fdacs.gov/", recommendedAction: "竞品高风险参考；自查冷藏链", alertTriggered: true, alertReason: "Florida FDACS Stop Sale", alertRuleIds: ["fl.fdacs"] }),
  ins({ id: "insp-0017", no: 17, jurisdiction: "Florida (FDACS)", regulatoryAgency: "FDACS", brand: "Luckin Coffee", establishmentType: "供应商/仓储 Supplier·Warehouse", storeName: "LUCKIN NA DC-FL Warehouse (示例)", address: "Miami, FL", inspectionDate: "2026-04-28", inspectionType: "Routine", inspectionResult: "Pass", standardizedCategory: catLabel(15), standardizedCategoryId: 15, standardizedCategoriesAll: [15], violationSeverity: "一般 Non-critical", followupRequired: "否 No", sourceType: "查询页 Web Lookup", riskLevel: "低风险", sourceUrlOrDocRef: "https://foodpermit.fdacs.gov/", recommendedAction: "—" }),
  ins({ id: "insp-0018", no: 18, jurisdiction: "New York City", regulatoryAgency: "NYC DOHMH", brand: "Pret A Manger", establishmentType: "轻食咖啡 Café w/ Food", storeName: "PRET A MANGER NYC-5 (示例)", address: "Midtown, Manhattan, NY", inspectionDate: "2026-05-25", inspectionType: "Routine", inspectionResult: "Pass", score: 9, grade: "A", standardizedCategory: catLabel(3), standardizedCategoryId: 3, standardizedCategoriesAll: [3], violationSeverity: "一般 Non-critical", followupRequired: "否 No", sourceType: "Open Data API", riskLevel: "低风险", sourceUrlOrDocRef: "https://data.cityofnewyork.us/resource/43nn-pn8j.json", recommendedAction: "—" }),
];

const alertsCount =
  regulatory.filter((r) => r.alertTriggered).length +
  inspections.filter((r) => r.alertTriggered).length;

const bySource: Record<string, number> = {};
for (const r of [...regulatory, ...inspections]) {
  bySource[r.provenance.sourceId] = (bySource[r.provenance.sourceId] ?? 0) + 1;
}

const meta: Meta = {
  schemaVersion: "2.0.0",
  dataAsOf: "2026-06-18",
  reportingPeriod: { label: "2026年6月 (示例 SEED)", year: 2026, month: 6 },
  generatedAt: SEED_TS,
  isSeedData: true,
  counts: {
    regulatory: regulatory.length,
    inspections: inspections.length,
    alerts: alertsCount,
    pendingReview: 0,
    bySource,
  },
  provenance: [
    {
      sourceId: "seed_example",
      name: "Seed / Example data (NOT real) — replaced by the real prep pull",
      jurisdictionId: null,
      accessType: "none",
      endpointOrUrl: null,
      oneTimePullFeasible: "no",
      collectedAt: SEED_TS,
      recordCount: regulatory.length + inspections.length,
      stalenessNote: "Clearly-labeled example data for development/demo only.",
      reVerifyBeforeRelying: true,
    },
  ],
};

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "regulatory.json"), JSON.stringify(regulatory, null, 2) + "\n");
writeFileSync(join(OUT, "inspections.json"), JSON.stringify(inspections, null, 2) + "\n");
writeFileSync(join(OUT, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

console.log(
  `seed: wrote ${regulatory.length} regulatory + ${inspections.length} inspections (${alertsCount} alerts) to data/v2/`,
);
