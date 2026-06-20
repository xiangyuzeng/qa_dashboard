/**
 * Curated seed rows transcribed VERBATIM from the client's 2026-05 bilingual report
 * (Import/Export + State/Local Regulation sheets). These are REAL, dated, sourced items —
 * not fabricated. collect.ts merges them with live auto-collected rows (Federal Register
 * import slugs, RSS sentiment). Manual-curated rows are fully bilingual (zh + en).
 *
 * To refresh: re-run live collectors, or edit these from the next monthly report.
 *
 * V2.7: the curated compliance arrays below are concatenated with per-domain JSON files in
 * prep/seeds/*.json — multi-state, source-verified rows authored by the expansion Workflow.
 */
import laborExtra from "./seeds/labor.json";
import buildingExtra from "./seeds/building.json";
import environmentExtra from "./seeds/environment.json";
import consumerExtra from "./seeds/consumer.json";

export type ImportSeed = {
  category: string;
  chineseTitle: string;
  englishTitle: string;
  agency: string;
  countryRegion: string | null;
  productInvolved: string | null;
  publicationDate: string | null;
  regulatoryAction: string; // ImportActionEnum
  chineseSummary: string;
  englishSummary: string;
  importExportImpact: string | null;
  documentationRequirement: string | null;
  riskLevel: string; // RiskLevelEnum
  sourceUrl: string | null;
  recommendedAction: string | null;
};

export const importSeeds: ImportSeed[] = [
  {
    category: "进口限制 / 动物源产品 Import Restriction / Animal Products",
    chineseTitle: "APHIS/USDA 联邦公报发布特定地区活禽、禽肉及其他禽类产品进口限制",
    englishTitle: "APHIS/USDA Published Restrictions on Live Poultry, Poultry Meat and Other Poultry Products From Specified Regions",
    agency: "USDA APHIS / Federal Register",
    countryRegion: "Specified regions",
    productInvolved: "Live poultry, poultry meat, other poultry products",
    publicationDate: "2026-05-14",
    regulatoryAction: "Rule/Notice",
    chineseSummary: "2026年5月14日，Federal Register 农业部索引列出“Restrictions on Importation of Live Poultry, Poultry Meat, and Other Poultry Products from Specified Regions”。",
    englishSummary: "On May 14, 2026, the Federal Register Agriculture Department index listed restrictions on importation of live poultry, poultry meat and other poultry products from specified regions.",
    importExportImpact: "对含禽肉/禽类产品进口有直接影响；对咖啡饮品业务影响较低，除非涉及含禽肉轻食或供应链。",
    documentationRequirement: "可能涉及 APHIS/FSIS 进口资格、卫生证书、产地限制。",
    riskLevel: "低风险",
    sourceUrl: "https://www.federalregister.gov/index/2026/agriculture-department",
    recommendedAction: "如进口含禽肉轻食或复合食品，应与报关行确认原产地和 FSIS/APHIS 资格。",
  },
  {
    category: "进口限制 / 动物源产品 Import Restriction / Animal Products",
    chineseTitle: "APHIS 发布 HPAI/Newcastle disease 相关额外进口限制",
    englishTitle: "APHIS Published Additional HPAI/Newcastle Disease-Related Import Restrictions",
    agency: "USDA APHIS / Federal Register",
    countryRegion: "Specified regions",
    productInvolved: "Pet, performing and research birds; bird carcasses",
    publicationDate: "2026-05-26",
    regulatoryAction: "Rule/Notice",
    chineseSummary: "Federal Register 农业部索引显示 2026年5月26日发布 HPAI、Newcastle disease 相关额外限制，涉及宠物、表演、研究用鸟及鸟类尸体。",
    englishSummary: "The Federal Register Agriculture Department index shows additional restrictions related to HPAI and Newcastle disease published on May 26, 2026, involving pet, performing and research birds and bird carcasses.",
    importExportImpact: "对食品进口直接影响有限，但提示禽类产品生物安全限制仍活跃。",
    documentationRequirement: "相关进口需确认 APHIS 许可证/证明文件。",
    riskLevel: "信息参考",
    sourceUrl: "https://www.federalregister.gov/index/2026/agriculture-department",
    recommendedAction: "仅在涉及禽类/动物源样品或促销活动动物材料时关注。",
  },
  {
    category: "进口/出口监管 / 植物保护 Import/Export / Plant Protection",
    chineseTitle: "APHIS 就 Plant Protection Act 下 modified organisms 征求信息",
    englishTitle: "APHIS Requested Information on Modified Organisms Subject to the Plant Protection Act",
    agency: "USDA APHIS / Federal Register",
    countryRegion: "United States",
    productInvolved: "Modified organisms; biological control organisms; plant pest/noxious weed risk",
    publicationDate: "2026-05-15",
    regulatoryAction: "Rule/Notice",
    chineseSummary: "APHIS 通过 Federal Register 就 Plant Protection Act 下 modified organisms 征求信息；文件涉及可禁止或限制进口、入境、出口或州际流通以防止植物有害生物传播。",
    englishSummary: "APHIS issued an RFI on modified organisms subject to the Plant Protection Act. The notice discusses authority to prohibit or restrict importation, entry, exportation or interstate movement to prevent plant pest or noxious weed risk.",
    importExportImpact: "对常规咖啡/饮品原料影响较低；对生物工程植物材料、发酵/微生物相关研发样品可能有潜在影响。",
    documentationRequirement: "如涉及 modified organisms/biological control organisms，需确认 APHIS 要求。",
    riskLevel: "低风险",
    sourceUrl: "https://www.federalregister.gov/documents/2026/05/15/2026-09833/request-for-information-on-modified-organisms-subject-to-the-plant-protection-act",
    recommendedAction: "研发或进口新型植物/微生物材料时纳入合规审查。",
  },
  {
    category: "进口资格 / 肉禽产品 Import Eligibility / Meat/Poultry",
    chineseTitle: "FSIS Mexico Import/Export Library 显示部分不合格产品清单更新",
    englishTitle: "FSIS Mexico Import/Export Library Listed Ineligible Products as of May 9, 2026",
    agency: "USDA FSIS",
    countryRegion: "Mexico; Canada; Australia",
    productInvolved: "Pork, poultry, beef, ovine/caprine meat products",
    publicationDate: "2026-05-09",
    regulatoryAction: "Eligibility Change",
    chineseSummary: "FSIS Mexico 页面显示截至 2026年5月9日的不合格产品，包括带脚猪胴体、来自加拿大的生禽、含特定工艺肉类产品等。",
    englishSummary: "The FSIS Mexico page lists ineligible products as of May 9, 2026, including pork carcasses with feet attached, raw poultry from Canada, and certain meat products based on processing or origin.",
    importExportImpact: "对含肉轻食或进口动物源配料有参考价值；对咖啡饮品本身影响低。",
    documentationRequirement: "可能涉及出口国/工厂资格、产品类别、卫生证书。",
    riskLevel: "低风险",
    sourceUrl: "https://www.fsis.usda.gov/inspection/import-export/import-export-library/mexico",
    recommendedAction: "如采购含肉轻食，应按产品原产国核对 FSIS import/export library。",
  },
  {
    category: "进口基础要求 / Prior Notice Import Baseline / Prior Notice",
    chineseTitle: "FDA 进口食品 Prior Notice 要求持续适用",
    englishTitle: "FDA Prior Notice Requirement Remains Applicable to Imported Foods",
    agency: "FDA / CBP",
    countryRegion: "All countries",
    productInvolved: "Human and animal food imported or offered for import into U.S.",
    publicationDate: null,
    regulatoryAction: "Prior Notice/FSVP",
    chineseSummary: "FDA Prior Notice 页面说明，进口或拟进口至美国的人用/动物食品须向 FDA 提前通知；FDA 与 CBP 协作以便更有效定位进口检查。本次未发现 2026年5月新的食品 Prior Notice 规则变化。",
    englishSummary: "FDA states that prior notice must be provided for food for humans or animals imported or offered for import into the U.S.; FDA uses the information with CBP to target import inspections. No new May-2026 rule identified this run.",
    importExportImpact: "所有食品进口均需持续关注；本次未发现 2026年5月新的食品 Prior Notice 规则变化。",
    documentationRequirement: "Prior Notice；进口商/报关行需确保 PN 信息准确。",
    riskLevel: "信息参考",
    sourceUrl: "https://www.fda.gov/industry/fda-import-process/prior-notice-imported-foods",
    recommendedAction: "月报中保留为基础要求；如产品为食品或动物饲料，确保每票 PN 合规。",
  },
  {
    category: "CBP/ACE 监控结果 CBP/ACE Monitoring Result",
    chineseTitle: "本轮未识别到 2026年5月直接影响食品进口的 CBP CSMS 更新",
    englishTitle: "No May 2026 CBP CSMS Update Directly Affecting Food Imports Was Identified in This Run",
    agency: "CBP CSMS",
    countryRegion: "United States",
    productInvolved: "ACE / PGA messages; FDA-regulated imports",
    publicationDate: null,
    regulatoryAction: "Monitoring Baseline",
    chineseSummary: "已将 CBP CSMS 纳入监控。本轮检索未识别到 2026年5月直接影响食品进口、Prior Notice 或 FDA PGA 申报的具体 CSMS 更新。",
    englishSummary: "CBP CSMS was included in monitoring. In this run, no May 2026 CSMS message was identified as directly changing food import, Prior Notice or FDA PGA filing requirements.",
    importExportImpact: "无新增直接影响；仍需持续监控 ACE/PGA 系统消息。",
    documentationRequirement: "视具体 CSMS 内容而定。",
    riskLevel: "信息参考",
    sourceUrl: "https://www.cbp.gov/trade/automated/cargo-systems-messaging-service",
    recommendedAction: "下月继续监控 CBP CSMS，尤其是 FDA PGA、ACE、Entry Type、Prior Notice 相关消息。",
  },
];

export type RegSeed = {
  jurisdiction: string; // RegJurisdictionEnum
  regulationBillName: string;
  chineseTitle: string;
  englishTitle: string;
  status: string; // RegStatusEnum
  publicationPassageDate: string | null;
  effectiveDate: string | null;
  coveredEntities: string | null;
  keyRequirements: string | null;
  chineseSummary: string;
  englishSummary: string;
  businessImpact: string | null;
  riskLevel: string; // RiskLevelEnum
  topic: string; // RegTopicEnum
  sourceUrl: string | null;
  recommendedAction: string | null;
};

export const regulationSeeds: RegSeed[] = [
  {
    jurisdiction: "New York City",
    regulationBillName: "NYC Added Sugars Warning / Sweet Truth Act",
    chineseTitle: "NYC 连锁餐厅 added sugars warning 规则已生效",
    englishTitle: "NYC Added Sugars Warning Rule Is in Effect for Chain Restaurants",
    status: "In effect",
    publicationPassageDate: "2025-10-09",
    effectiveDate: "2025-10-04",
    coveredEntities: "Nationwide chains with 15+ locations operating food service establishments in NYC",
    keyRequirements: "对含 50g 或以上 added sugars 的预包装食品/饮料或等同菜单项目标注 warning icon，并提供相应消费者提示。",
    chineseSummary: "NYC Health Department 宣布自 2025年10月4日起实施 added sugars warning rule，要求 NYC 连锁餐厅对含 added sugars 达到每日建议限量的菜单项目作出图标提示。",
    englishSummary: "NYC Health Department announced that the added sugars warning rule took effect on Oct. 4, 2025, requiring chain restaurants to identify menu items high in added sugars with an icon and warning statement.",
    businessImpact: "对含糖咖啡饮品、奶茶、果汁饮品、冰沙、预包装饮品及 App/Kiosk 菜单有直接影响。",
    riskLevel: "高风险",
    topic: "added_sugar",
    sourceUrl: "https://www.nyc.gov/site/doh/about/press/pr2025/new-added-sugars-warning-rule-goes-into-effect-2025.page",
    recommendedAction: "持续核查 NYC 菜单、App、Kiosk 和外卖平台中所有饮品 added sugars 数据和图标展示。",
  },
  {
    jurisdiction: "New York City",
    regulationBillName: "High Sugar Warnings on Food Service Establishment Menus",
    chineseTitle: "NYC 高糖警示规则适用于全国 15 家及以上门店的餐饮企业",
    englishTitle: "NYC High Sugar Warning Rule Applies to Food Service Chains With 15+ National Locations",
    status: "In effect",
    publicationPassageDate: "2025-10-04",
    effectiveDate: "2025-10-04",
    coveredEntities: "Food service establishments with 15 or more locations nationally",
    keyRequirements: "要求对每份 added sugars 达到或超过 50g Daily Value 的菜单项目显示 added sugar warning icon。",
    chineseSummary: "NYC Rules 页面说明该规则适用于全国 15 家及以上门店的 food service establishments，并要求对 added sugars 达到 50g Daily Value 的菜单项目显示警示图标。",
    englishSummary: "NYC Rules state that food service establishments with 15+ national locations must display added sugar warning icons for menu items where a serving contains added sugars at or above the 50g Daily Value.",
    businessImpact: "连锁咖啡/饮品企业需进行营养计算、菜单图标、培训和标签材料更新。",
    riskLevel: "高风险",
    topic: "added_sugar",
    sourceUrl: "https://rules.cityofnewyork.us/rule/high-sugar-warnings-on-food-service-establishment-menus/",
    recommendedAction: "保持配方变更与营养数据库同步，防止新品或 seasonal drink 漏标。",
  },
  {
    jurisdiction: "California",
    regulationBillName: "SB 68 / ADDE Act",
    chineseTitle: "California SB 68 餐厅主要过敏原披露要求即将生效",
    englishTitle: "California SB 68 Restaurant Major Allergen Disclosure Requirement Approaches Effective Date",
    status: "Pending effective",
    publicationPassageDate: "2025-10-13",
    effectiveDate: "2026-07-01",
    coveredEntities: "Food facilities / restaurant chains with 20+ locations in the United States",
    keyRequirements: "要求披露 Top 9 major food allergens，可通过菜单或数字方式披露，并需提供非数字替代方式。",
    chineseSummary: "California SB 68 / ADDE Act 要求满足条件的餐饮连锁对菜单项中的九大主要过敏原进行书面披露。2026年5月处于实施准备窗口。",
    englishSummary: "California SB 68 / ADDE Act requires covered chain food facilities to provide written disclosure of the nine major food allergens in menu items. May 2026 is within the implementation preparation window.",
    businessImpact: "对 CA 门店菜单、App、Kiosk、QR code、纸质 allergen guide 和员工培训有直接影响。",
    riskLevel: "高风险",
    topic: "allergen_disclosure",
    sourceUrl: "https://legiscan.com/CA/text/SB68/id/3269035",
    recommendedAction: "在 2026年7月1日前完成 CA 菜单过敏原矩阵、线上/线下披露和员工问答口径。",
  },
  {
    jurisdiction: "California",
    regulationBillName: "SB 68 / ADDE Act Implementation Commentary",
    chineseTitle: "California 成为首个要求餐饮菜单披露主要过敏原的州",
    englishTitle: "California Became the First State to Require Restaurant Menu Major Allergen Disclosure",
    status: "Pending effective",
    publicationPassageDate: "2025-10-13",
    effectiveDate: "2026-07-01",
    coveredEntities: "Restaurant chains / food facilities with 20+ U.S. locations",
    keyRequirements: "披露 milk、eggs、fish、crustacean shellfish、tree nuts、peanuts、wheat、soybeans、sesame。",
    chineseSummary: "行业法律分析确认，加州 SB 68 已签署成为法律，并将要求符合条件的餐饮企业披露主要过敏原。",
    englishSummary: "Legal/industry commentary confirms that California SB 68 was signed into law and will require covered restaurant chains to disclose major allergens.",
    businessImpact: "适用于大型连锁餐饮；对咖啡/轻食企业的菜单和标签系统具有高影响。",
    riskLevel: "高风险",
    topic: "allergen_disclosure",
    sourceUrl: "https://www.gtlaw.com/en/insights/2025/9/california-poised-to-become-first-state-to-mandate-food-allergen-disclosures-for-restaurants-sb-68-awaits-gov-newsoms-signature",
    recommendedAction: "将 CA 过敏原披露纳入新品上市 check list 和变更控制流程。",
  },
  {
    jurisdiction: "New York State",
    regulationBillName: "S.5381 / A.6558A NY Allergen Law",
    chineseTitle: "纽约州预包装现场制售食品过敏原标签法已签署，预计 2026年11月生效",
    englishTitle: "New York Premises-Packed Food Allergen Labeling Law Signed; Expected Effective November 2026",
    status: "Pending effective",
    publicationPassageDate: "2025-11-13",
    effectiveDate: "2026-11-01",
    coveredEntities: "Food establishments preparing, packing and selling food on the same premises for off-premises consumption",
    keyRequirements: "对现场制备并预包装出售的食品，要求在包装或标签上标明九大主要过敏原及相关蛋白来源。",
    chineseSummary: "纽约州参议院公告显示 S.5381/A.6558A 已签署成为法律，要求 food establishments 对现场制备并预包装销售食品进行主要过敏原标签披露。",
    englishSummary: "New York State Senate announcement states that S.5381/A.6558A was signed into law, requiring food establishments to label major allergens on food prepared, prepackaged and sold on the same premises.",
    businessImpact: "对 grab-and-go 轻食、烘焙、三明治、预包装咖啡配套食品有直接影响。",
    riskLevel: "高风险",
    topic: "allergen_disclosure",
    sourceUrl: "https://www.nysenate.gov/newsroom/press-releases/2025/pete-harckham/harckham-lunsford-bill-requiring-allergen-labeling",
    recommendedAction: "梳理 NY 门店是否销售现场预包装轻食；提前建立 label template 和 allergen database。",
  },
  {
    jurisdiction: "New York State",
    regulationBillName: "NY Allergen Law industry update",
    chineseTitle: "2026年5月行业更新提示 NY Allergen Law 预计 2026年11月生效",
    englishTitle: "May 2026 Industry Update Notes NY Allergen Law Expected to Take Effect in November 2026",
    status: "Monitoring",
    publicationPassageDate: "2026-05-28",
    effectiveDate: "2026-11-01",
    coveredEntities: "Food establishments preparing and packing foods on premises",
    keyRequirements: "适用范围覆盖 delis、bakeries、ice cream parlors、sandwich shops、cafeterias、retail food stores、food trucks 等。",
    chineseSummary: "2026年5月28日行业法律更新指出 NY Allergen Law 预计 2026年11月生效，并由 state/local health departments 执行。",
    englishSummary: "A May 28, 2026 industry legal update noted that the NY Allergen Law is expected to become effective in November 2026 and be enforced by state and local health departments.",
    businessImpact: "对门店现场包装食品非常相关；需要在月报中持续跟踪执行细节。",
    riskLevel: "中风险",
    topic: "allergen_disclosure",
    sourceUrl: "https://www.spencerfane.com/insight/additional-legislation-expected-to-mandate-food-allergen-disclosures-for-food-establishments-what-you-need-to-know/",
    recommendedAction: "关注 NYSDOH/地方卫生部门后续 guidance；准备现场包装食品清单。",
  },
  {
    jurisdiction: "Other",
    regulationBillName: "Maine PFAS in Food Packaging Ban",
    chineseTitle: "Maine PFAS 食品包装禁令于 2026年5月25日生效",
    englishTitle: "Maine PFAS Food Packaging Ban Took Effect on May 25, 2026",
    status: "In effect",
    publicationPassageDate: "2024-01-01",
    effectiveDate: "2026-05-25",
    coveredEntities: "Food packaging and takeout packaging used in Maine",
    keyRequirements: "禁止特定 intentionally added PFAS 食品包装材料。",
    chineseSummary: "2026年5月媒体和行业报道显示 Maine PFAS 食品包装禁令于 2026年5月25日生效，影响 takeout packaging、containers、wraps、plates、liners 等。",
    englishSummary: "Reports indicate Maine's PFAS food packaging ban took effect on May 25, 2026, affecting takeout packaging, containers, wraps, plates, liners and similar materials.",
    businessImpact: "若甲方未来进入 Maine 或使用全国统一包装规格，需确认食品接触包装 PFAS 状态。",
    riskLevel: "中风险",
    topic: "pfas_packaging",
    sourceUrl: "https://www.the-sun.com/money/16333160/olive-garden-takeout-change-toxic-packaging-ban-maine/",
    recommendedAction: "要求包装供应商提供 PFAS-free 声明；关注 NY/CA/NJ/MA 类似包装法规。",
  },
  {
    jurisdiction: "Other",
    regulationBillName: "Restaurant allergen disclosure bills (MI/NJ/MD)",
    chineseTitle: "Michigan、New Jersey、Maryland 等州推进餐厅过敏原披露法案",
    englishTitle: "Michigan, New Jersey and Maryland Advanced Restaurant Allergen Disclosure Bills",
    status: "Proposed",
    publicationPassageDate: "2026-02-18",
    effectiveDate: null,
    coveredEntities: "Restaurants / food service permit holders depending on state bill",
    keyRequirements: "类似 California SB 68 的餐饮过敏原菜单披露要求开始在更多州出现。",
    chineseSummary: "Allergic Living 报道 Michigan、New Jersey、Maryland 等州提出餐厅过敏原披露法案，反映州级餐饮过敏原披露趋势扩大。",
    englishSummary: "Allergic Living reported that Michigan, New Jersey and Maryland introduced restaurant allergen disclosure bills, indicating expansion of state-level allergen disclosure trends.",
    businessImpact: "对多州连锁咖啡/轻食品牌有中长期影响，尤其 NJ 与甲方门店所在地相关。",
    riskLevel: "中风险",
    topic: "allergen_disclosure",
    sourceUrl: "https://www.allergicliving.com/2026/02/18/restaurant-allergen-bills-introduced-in-3-states-how-you-can-help/",
    recommendedAction: "将 NJ 餐饮过敏原披露法案纳入持续监控；提前建立统一过敏原数据库。",
  },
];

/* ════════════════════════════════════════════════════════════════════════════
 * V2.5 — four compliance-domain seeds (labor / building / environment / consumer).
 * Stable, authoritative law transcribed verbatim with a source link. `applicabilityRuleId`
 * joins a row to a §7.3 engine rule so collect.ts can stamp `appliesToUs`.
 * ════════════════════════════════════════════════════════════════════════════ */

export type LaborSeed = {
  jurisdiction: string;
  regulationBillName: string;
  chineseTitle: string;
  englishTitle: string;
  agency: string;
  applicabilityThreshold: string | null;
  status: string; // RegStatusEnum
  effectiveDate: string | null;
  keyRequirements: string | null;
  chineseSummary: string;
  englishSummary: string;
  businessImpact: string | null;
  enforcementRecord: string | null;
  riskLevel: string; // RiskLevelEnum
  topic: string; // LaborTopicEnum
  applicabilityRuleId: string | null;
  sourceUrl: string | null;
  recommendedAction: string | null;
};

export const laborSeeds: LaborSeed[] = [
  ...(laborExtra as LaborSeed[]),
  {
    jurisdiction: "New York City",
    regulationBillName: "NYC Fair Workweek Law — Fast Food (6 RCNY Ch. 7 Subch. F)",
    chineseTitle: "NYC 公平工作周法（快餐业）",
    englishTitle: "NYC Fair Workweek Law (Fast Food Employers)",
    agency: "NYC DCWP",
    applicabilityThreshold: "全国 30 家以上的快餐连锁 Fast food establishments part of a chain of 30+ locations nationally",
    status: "In effect",
    effectiveDate: "2017-11-26",
    keyRequirements:
      "提前 14 天发布排班；变更需支付可预测性补偿；新增工时须先提供给现有员工；未经同意不得 clopening。",
    chineseSummary:
      "NYC 公平工作周法要求被认定为全国 30 家以上的快餐雇主提前发布排班、对排班变更支付补偿，并在招聘前优先向现有员工提供新增工时。是否适用取决于「快餐」认定与门店计数口径。",
    englishSummary:
      "NYC Fair Workweek requires fast-food employers (chains of 30+ locations nationally) to post schedules 14 days ahead, pay predictability premiums for changes, and offer new hours to existing staff before hiring. Applicability turns on the fast-food classification and the location-count basis.",
    businessImpact:
      "若被认定为快餐模式，将直接影响排班系统、用工成本与合规流程；瑞幸目前门店数处于阈值边缘（在岗 18 / 全状态 30）。",
    enforcementRecord:
      "2026 年 3 月，一家 Dunkin' 加盟商就公平工作周排班违规与 DCWP 达成 150 万美元和解——与瑞幸的快餐模式直接可比。",
    riskLevel: "高风险",
    topic: "fair_workweek",
    applicabilityRuleId: "nyc_fair_workweek",
    sourceUrl: "https://www.nyc.gov/site/dca/about/fair-workweek-law.page",
    recommendedAction: "请法务确认快餐模式认定与门店计数口径；若适用，提前部署合规排班系统。",
  },
  {
    jurisdiction: "New York City",
    regulationBillName: "NYC Earned Safe and Sick Time Act (Paid Safe and Sick Leave)",
    chineseTitle: "NYC 带薪安全与病假法",
    englishTitle: "NYC Earned Safe and Sick Time Act",
    agency: "NYC DCWP",
    applicabilityThreshold: "在 NYC 有员工的雇主；5–99 人享 40 小时带薪、100+ 人享 56 小时带薪",
    status: "In effect",
    effectiveDate: "2014-04-01",
    keyRequirements: "按工时累积安全/病假；雇主须提供书面政策并在工资单上显示累积余额；不得报复。2026-02-22 修订新增 32 小时无薪假并扩大适用事由。",
    chineseSummary:
      "NYC ESSTA 要求在 NYC 有员工的雇主提供安全与病假；5–99 人享 40 小时带薪、100+ 人享 56 小时带薪。2026-02-22 修订在此之上新增 32 小时无薪假并扩大适用事由。瑞幸 30 家门店很可能属于 100+ 档（56 小时）。",
    englishSummary:
      "NYC's ESSTA requires NYC employers to provide safe/sick leave — 40 paid hours at 5–99 employees, 56 at 100+. A 2026-02-22 amendment adds 32 hours of UNPAID leave on top and broadens qualifying reasons. Luckin's 30 stores likely fall in the 100+ (56-hour) tier.",
    businessImpact: "对所有 NYC 门店用工政策、考勤与工资单系统均有直接影响；须确认 100+ 员工档位与 2026 新增无薪假。",
    enforcementRecord: "DCWP 定期就病假政策缺失、报复及未支付累积进行处罚。",
    riskLevel: "高风险",
    topic: "sick_safe_leave",
    applicabilityRuleId: "nyc_sick_safe_leave",
    sourceUrl: "https://www.nyc.gov/site/dca/about/paid-safe-sick-leave.page",
    recommendedAction: "核查门店书面病假政策、工资单累积显示与告示张贴是否合规。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "FLSA Tip Regulations — Tip Credit & Dual Jobs (29 CFR 531)",
    chineseTitle: "FLSA 小费规则（小费抵扣与双重工作）",
    englishTitle: "FLSA Tip Regulations — Tip Credit and Dual Jobs",
    agency: "US DOL Wage & Hour Division",
    applicabilityThreshold: "使用小费抵扣 / 雇用获小费员工的雇主",
    status: "In effect",
    effectiveDate: "2024-12-17",
    keyRequirements: "雇主/经理不得占有员工小费；小费池规则持续有效；2021 年 80/20/30 双职规则已被第五巡回法院撤销，DOL 于 2024-12-17 恢复 2021 年前条文。",
    chineseSummary:
      "联邦 FLSA 小费规则规范小费抵扣与双重工作。2021 年 80/20/30 双职规则已被第五巡回法院撤销，DOL 于 2024-12-17 恢复旧条文；仍有效的是「雇主/经理不得占有小费」与小费池规则。瑞幸以预点单/外带为主，若不使用小费抵扣相关性较低，但经理占有小费的禁令仍适用。",
    englishSummary:
      "Federal FLSA tip rules govern tip credits and dual jobs. The 2021 80/20/30 dual-jobs rule was vacated by the 5th Circuit and DOL restored the prior text effective 2024-12-17; the no-manager-tips and tip-pool rules remain binding. Limited relevance if Luckin takes no tip credit, but the manager-tip ban still applies.",
    businessImpact: "若不采用小费抵扣影响较低；但经理/雇主占有小费的禁令始终适用，须确认门店小费处理流程。",
    enforcementRecord: "DOL WHD 经常追缴餐饮业小费抵扣违规；经理占有小费构成直接责任。",
    riskLevel: "中风险",
    topic: "overtime_tip",
    applicabilityRuleId: null,
    sourceUrl: "https://www.dol.gov/agencies/whd/flsa/tips",
    recommendedAction: "确认是否使用小费抵扣；持续监控 DOL 后续小费规则。",
  },
  {
    jurisdiction: "New York State",
    regulationBillName: "NY Minimum Wage (NYC rate)",
    chineseTitle: "纽约州最低工资（纽约市档）",
    englishTitle: "NY Minimum Wage (NYC rate)",
    agency: "NY DOL",
    applicabilityThreshold: "所有 NYC 雇主 All NYC employers",
    status: "In effect",
    effectiveDate: "2026-01-01",
    keyRequirements: "2026 年 NYC 最低工资 $17.00/小时；餐饮小费员工 $11.35 现金 + $5.65 小费抵扣（须告知且小费补足至 $17）。",
    chineseSummary:
      "纽约州法定最低工资在纽约市 2026 年为 $17.00/小时，远高于联邦 $7.25。餐饮小费员工可用小费抵扣，但须事先告知且实际收入补足至最低工资。这是门店实际工资底线。",
    englishSummary:
      "NY's minimum wage in NYC is $17.00/hr for 2026 (well above the $7.25 federal floor). Tipped food-service workers may be paid with a tip credit only with notice and if tips bring pay to $17. This sets the actual barista wage floor.",
    businessImpact: "直接决定门店基础时薪与排班成本；小费抵扣使用须合规告知。",
    enforcementRecord: "NY DOL 经常追缴未付工资差额。",
    riskLevel: "高风险",
    topic: "min_wage",
    applicabilityRuleId: null,
    sourceUrl: "https://dol.ny.gov/minimum-wage-0",
    recommendedAction: "确认全部门店时薪 ≥ $17.00；如用小费抵扣，落实告知与补足机制。",
  },
  {
    jurisdiction: "New York State",
    regulationBillName: "Wage Theft Prevention Act (Labor Law §195)",
    chineseTitle: "工资盗窃防止法（工资通知）",
    englishTitle: "NY Wage Theft Prevention Act",
    agency: "NY DOL",
    applicabilityThreshold: "所有纽约州私营雇主 All NY private employers",
    status: "In effect",
    effectiveDate: "2011-04-09",
    keyRequirements: "入职时提供书面工资通知（英语 + 主要语言）；每个发薪日提供逐项工资单。",
    chineseSummary:
      "纽约州工资盗窃防止法要求雇主在入职时向每名员工提供书面工资通知（含英语与员工主要语言），并在每个发薪日提供合规的逐项工资单。违规罚款可达每名员工 $5,000，集体诉讼常见。",
    englishSummary:
      "NY's Wage Theft Prevention Act requires written wage notices at hire (English + the employee's primary language) and an itemized wage statement each payday. Penalties run up to $5,000 per employee; class actions are common.",
    businessImpact: "须向每名门店员工签发 §195.1 工资通知与合规工资单，否则面临高额罚款。",
    enforcementRecord: "违规罚款最高每员工 $5,000；集体诉讼频发。",
    riskLevel: "高风险",
    topic: "wage_theft",
    applicabilityRuleId: null,
    sourceUrl: "https://dol.ny.gov/notice-pay-rate",
    recommendedAction: "核查入职工资通知（双语）与每期工资单是否合规。",
  },
  {
    jurisdiction: "New York City",
    regulationBillName: "NYC Fast Food Just Cause / Wrongful Discharge (Admin Code §20-1272)",
    chineseTitle: "NYC 快餐“正当理由”解雇保护",
    englishTitle: "NYC Fast Food Just Cause / Wrongful Discharge",
    agency: "NYC DCWP",
    applicabilityThreshold: "快餐场所（与公平工作周同为全国 30+ 门店口径）",
    status: "In effect",
    effectiveDate: "2021-07-04",
    keyRequirements: "30 天试用期后，非有“正当理由”或正当经济原因不得解雇或削减 15% 以上工时；雇主负举证责任；可仲裁。",
    chineseSummary:
      "NYC 快餐“正当理由”法终结快餐业的随意雇佣：30 天试用期后，雇主非有正当理由或正当经济原因不得解雇员工或削减其 15% 以上工时，且由雇主承担举证责任。与公平工作周共用“全国 30+ 快餐门店”认定，对瑞幸很可能适用。",
    englishSummary:
      "NYC Fast Food Just Cause ends at-will employment for fast-food workers: after a 30-day probation, an employer may not discharge or cut hours 15%+ without just cause or a bona fide economic reason, and the employer bears the burden. It shares Fair Workweek's 30+ fast-food gate and likely covers Luckin.",
    businessImpact: "需建立渐进式纪律、绩效记录与解雇文档流程；解雇/减时风险显著上升。",
    enforcementRecord: "在 Restaurant Law Center v. City of NY 案中获 SDNY 维持（2022 年 2 月）。",
    riskLevel: "高风险",
    topic: "other",
    applicabilityRuleId: "nyc_fast_food_just_cause",
    sourceUrl: "https://codelibrary.amlegal.com/codes/newyorkcity/latest/NYCadmin/0-0-0-131240",
    recommendedAction: "建立渐进式纪律与解雇文档制度；请法务确认快餐认定。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "Family and Medical Leave Act (FMLA)",
    chineseTitle: "家庭与医疗休假法",
    englishTitle: "Family and Medical Leave Act (FMLA)",
    agency: "US DOL Wage & Hour Division",
    applicabilityThreshold: "75 英里内雇用 50+ 员工；员工满 12 个月且 1,250 小时",
    status: "In effect",
    effectiveDate: "1993-08-05",
    keyRequirements: "为符合条件的员工提供最长 12 周无薪、保留职位的家庭/医疗假。",
    chineseSummary:
      "FMLA 在雇主于 75 英里范围内雇用 50 名以上员工时适用，为符合资格的员工（满 12 个月且工作 1,250 小时）提供最长 12 周无薪、保留职位的家庭或医疗假。瑞幸 30 家 NYC 门店几乎必然满足 50 人门槛。",
    englishSummary:
      "FMLA applies once an employer has 50+ employees within 75 miles, giving eligible employees (12 months + 1,250 hours) up to 12 weeks of unpaid, job-protected family/medical leave. Luckin's 30 NYC stores almost certainly meet the 50-employee threshold.",
    businessImpact: "须建立 FMLA 资格判定、休假管理与复职流程。",
    enforcementRecord: "DOL WHD 执法，私人诉讼常见。",
    riskLevel: "中风险",
    topic: "other",
    applicabilityRuleId: "fmla",
    sourceUrl: "https://www.dol.gov/agencies/whd/fmla",
    recommendedAction: "确认 75 英里内员工数；建立 FMLA 政策与休假台账。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "Title VII of the Civil Rights Act of 1964",
    chineseTitle: "民权法第七章（反歧视）",
    englishTitle: "Title VII of the Civil Rights Act of 1964",
    agency: "EEOC",
    applicabilityThreshold: "雇用 15+ 员工 15+ employees",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "禁止基于种族、肤色、宗教、性别、原国籍的就业歧视与骚扰。",
    chineseSummary:
      "民权法第七章在雇主雇用 15 名以上员工时适用，禁止基于种族、肤色、宗教、性别（含怀孕、性取向、性别认同）和原国籍的就业歧视与骚扰。瑞幸 30 家门店远超 15 人门槛。",
    englishSummary:
      "Title VII applies at 15+ employees and bars employment discrimination/harassment by race, color, religion, sex (incl. pregnancy, orientation, gender identity) and national origin. Luckin (30 stores) is well over the 15-employee gate.",
    businessImpact: "须有反歧视/反骚扰政策、投诉处理与培训。",
    enforcementRecord: "EEOC 经常就餐饮业歧视与骚扰提起诉讼/和解。",
    riskLevel: "中风险",
    topic: "discrimination_eeoc",
    applicabilityRuleId: "eeoc_title_vii",
    sourceUrl: "https://www.eeoc.gov/statutes/title-vii-civil-rights-act-1964",
    recommendedAction: "落实 EEO 政策、投诉渠道与年度反歧视/反骚扰培训。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "Americans with Disabilities Act — Title I (Employment)",
    chineseTitle: "美国残疾人法第一章（雇佣）",
    englishTitle: "ADA Title I (Employment)",
    agency: "EEOC",
    applicabilityThreshold: "雇用 15+ 员工 15+ employees",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "为残障员工提供合理便利；不得在雇佣中歧视。",
    chineseSummary:
      "ADA 第一章在雇主雇用 15 名以上员工时适用，要求为残障员工提供合理便利，并禁止在招聘、雇佣、晋升中歧视。与第七章、PWFA 同为 15 人门槛。",
    englishSummary:
      "ADA Title I applies at 15+ employees, requiring reasonable accommodation for employees with disabilities and barring disability discrimination in hiring/employment. It shares the 15-employee gate with Title VII and PWFA.",
    businessImpact: "须建立合理便利的互动流程与无障碍用工政策。",
    enforcementRecord: "EEOC 经常就未提供合理便利达成和解。",
    riskLevel: "中风险",
    topic: "discrimination_eeoc",
    applicabilityRuleId: null,
    sourceUrl: "https://www.eeoc.gov/disability-discrimination",
    recommendedAction: "建立合理便利互动流程；培训经理识别与处理便利请求。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "Age Discrimination in Employment Act (ADEA)",
    chineseTitle: "就业年龄歧视法",
    englishTitle: "Age Discrimination in Employment Act (ADEA)",
    agency: "EEOC",
    applicabilityThreshold: "雇用 20+ 员工 20+ employees",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "禁止对 40 岁及以上员工的年龄歧视。",
    chineseSummary:
      "ADEA 在雇主雇用 20 名以上员工时适用，禁止在招聘、雇佣、晋升、解雇中对 40 岁及以上员工进行年龄歧视。",
    englishSummary:
      "The ADEA applies at 20+ employees and prohibits age discrimination against workers 40 and older in hiring, employment, promotion and discharge.",
    businessImpact: "招聘与解雇决策须避免年龄歧视痕迹。",
    enforcementRecord: "EEOC 执法，私人诉讼常见。",
    riskLevel: "低风险",
    topic: "discrimination_eeoc",
    applicabilityRuleId: "eeoc_adea",
    sourceUrl: "https://www.eeoc.gov/statutes/age-discrimination-employment-act-1967",
    recommendedAction: "审查招聘/解雇流程，避免年龄相关不利影响。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "Pregnant Workers Fairness Act (PWFA)",
    chineseTitle: "孕期工作者公平法",
    englishTitle: "Pregnant Workers Fairness Act (PWFA)",
    agency: "EEOC",
    applicabilityThreshold: "雇用 15+ 员工 15+ employees",
    status: "In effect",
    effectiveDate: "2023-06-27",
    keyRequirements: "为怀孕、分娩及相关情况提供合理便利（休息、座位、调岗、排班调整等）。",
    chineseSummary:
      "PWFA 自 2023-06-27 起对雇用 15 名以上员工的雇主生效，要求为已知的怀孕、分娩及相关情况提供合理便利，如更多休息、座位、调整排班或临时调岗。",
    englishSummary:
      "The PWFA, effective 2023-06-27 for employers with 15+ employees, requires reasonable accommodation for known pregnancy, childbirth and related conditions — e.g., extra breaks, seating, schedule changes or light duty.",
    businessImpact: "门店须为孕期员工提供休息/座位/排班便利。",
    enforcementRecord: "EEOC 自 2023-06-27 起受理 PWFA 投诉。",
    riskLevel: "中风险",
    topic: "discrimination_eeoc",
    applicabilityRuleId: "pwfa",
    sourceUrl: "https://www.eeoc.gov/wysk/what-you-should-know-about-pregnant-workers-fairness-act",
    recommendedAction: "更新便利政策纳入孕期；培训经理响应孕期便利请求。",
  },
  {
    jurisdiction: "New York State",
    regulationBillName: "NY Pay Transparency Law",
    chineseTitle: "纽约州薪资透明法",
    englishTitle: "NY Pay Transparency Law",
    agency: "NY DOL",
    applicabilityThreshold: "雇用 4+ 员工 4+ employees",
    status: "In effect",
    effectiveDate: "2023-09-17",
    keyRequirements: "所有招聘、晋升、调岗广告须披露最低-最高薪资范围。",
    chineseSummary:
      "纽约州薪资透明法自 2023-09-17 起对雇用 4 名以上员工的雇主生效，要求所有招聘、晋升和调岗广告披露真实的最低-最高薪资范围。NYC 地方法 LL32 同为 4 人门槛。",
    englishSummary:
      "NY's Pay Transparency Law, effective 2023-09-17 for employers with 4+ employees, requires every job, promotion and transfer advertisement to disclose a good-faith min–max pay range. NYC's LL32 mirrors the 4-employee gate.",
    businessImpact: "所有 barista 招聘广告须标注薪资范围。",
    enforcementRecord: "NY DOL 执法；NYC CCHR 罚款最高 $250,000。",
    riskLevel: "中风险",
    topic: "posting",
    applicabilityRuleId: "ny_salary_transparency",
    sourceUrl: "https://dol.ny.gov/pay-transparency",
    recommendedAction: "在所有招聘/晋升/调岗广告中加入薪资范围。",
  },
  {
    jurisdiction: "New York City",
    regulationBillName: "NYC Fair Chance Act (Ban the Box)",
    chineseTitle: "NYC 公平机会法（禁问犯罪记录）",
    englishTitle: "NYC Fair Chance Act",
    agency: "NYC Commission on Human Rights",
    applicabilityThreshold: "雇用 4+ 员工 4+ employees",
    status: "In effect",
    effectiveDate: "2015-10-27",
    keyRequirements: "在发出有条件录用前不得询问犯罪历史；须执行“公平机会程序”。",
    chineseSummary:
      "NYC 公平机会法对雇用 4 名以上员工的雇主适用，禁止在发出有条件录用通知前询问或考虑求职者的犯罪历史，并要求撤回录用前执行“公平机会程序”。",
    englishSummary:
      "The NYC Fair Chance Act applies at 4+ employees and bars asking about or considering a candidate's criminal history before a conditional offer, requiring a Fair Chance Process before any adverse action.",
    businessImpact: "招聘流程须将背景调查推迟到有条件录用之后。",
    enforcementRecord: "NYC CCHR 执法，含罚款与赔偿。",
    riskLevel: "中风险",
    topic: "discrimination_eeoc",
    applicabilityRuleId: "nyc_fair_chance",
    sourceUrl: "https://www.nyc.gov/site/cchr/law/fair-chance-act.page",
    recommendedAction: "调整招聘流程：背景调查仅在有条件录用后进行，并走公平机会程序。",
  },
  {
    jurisdiction: "New York City",
    regulationBillName: "NYC Lactation Accommodation (Local Laws 185/186 of 2018)",
    chineseTitle: "NYC 哺乳便利法",
    englishTitle: "NYC Lactation Accommodation",
    agency: "NYC Commission on Human Rights",
    applicabilityThreshold: "雇用 4+ 员工 4+ employees",
    status: "In effect",
    effectiveDate: "2019-03-18",
    keyRequirements: "提供哺乳室与书面政策；自 2025-05-11 起须在门店实体与电子张贴政策。",
    chineseSummary:
      "NYC 哺乳便利法对雇用 4 名以上员工的雇主适用，要求提供哺乳室（非卫生间、有电源与座椅）与书面哺乳政策；自 2025-05-11 起还须在工作场所实体与电子方式张贴该政策。",
    englishSummary:
      "NYC's Lactation Accommodation law applies at 4+ employees, requiring a lactation room (not a restroom; with electricity and seating) and a written policy; since 2025-05-11 the policy must be posted physically and electronically.",
    businessImpact: "门店需规划哺乳空间、书面政策与张贴。",
    enforcementRecord: "NYC CCHR 执法。",
    riskLevel: "中风险",
    topic: "other",
    applicabilityRuleId: "nyc_lactation",
    sourceUrl: "https://www.nyc.gov/site/cchr/law/lactation.page",
    recommendedAction: "为门店配置哺乳室、书面政策并完成张贴。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "National Labor Relations Act — Protected Concerted Activity (§7)",
    chineseTitle: "国家劳资关系法（集体行动权 §7）",
    englishTitle: "NLRA Section 7 — Protected Concerted Activity",
    agency: "NLRB",
    applicabilityThreshold: "几乎所有州际商业中的私营雇主 Nearly all private employers",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "员工有权讨论工资/工作条件、组织工会；雇主不得干涉或报复。",
    chineseSummary:
      "NLRA 第 7 条保护员工讨论工资与工作条件、共同行动及组织工会的权利，雇主不得干涉、限制或报复。咖啡/连锁行业近年工会化与不当劳动行为案件增多。",
    englishSummary:
      "NLRA Section 7 protects employees' rights to discuss pay/working conditions, act together, and unionize; employers may not interfere or retaliate. The coffee/chain sector has seen rising unionization and unfair-labor-practice cases.",
    businessImpact: "门店政策（如禁谈工资）与对组织活动的回应须合规，避免不当劳动行为指控。",
    enforcementRecord: "NLRB 已就多家咖啡连锁（如 Starbucks）提起不当劳动行为指控。",
    riskLevel: "中风险",
    topic: "union_nlrb",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nlrb.gov/about-nlrb/rights-we-protect/the-law/employees",
    recommendedAction: "审查员工手册避免限制 §7 权利；培训经理合规应对组织活动。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "Form I-9 Employment Eligibility Verification (IRCA)",
    chineseTitle: "I-9 就业资格核查",
    englishTitle: "Form I-9 Employment Eligibility Verification",
    agency: "USCIS / DHS",
    applicabilityThreshold: "所有美国雇主，每名新员工 All US employers, every new hire",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "入职 3 个工作日内完成 I-9 并留存；纽约州不强制 E-Verify。",
    chineseSummary:
      "所有美国雇主须为每名新员工在入职 3 个工作日内完成并留存 I-9 就业资格核查表。E-Verify 在纽约州非强制。ICE 对餐饮业的 I-9 审计与罚款常见。",
    englishSummary:
      "Every US employer must complete and retain a Form I-9 for each new hire within 3 business days. E-Verify is not mandatory in NY. ICE I-9 audits and fines are common in food service.",
    businessImpact: "须为每名门店员工建立合规 I-9 流程与留存。",
    enforcementRecord: "ICE 对餐饮业 I-9 审计与罚款频发。",
    riskLevel: "中风险",
    topic: "classification",
    applicabilityRuleId: null,
    sourceUrl: "https://www.uscis.gov/i-9",
    recommendedAction: "标准化 I-9 完成与留存流程；定期内审。",
  },
  {
    jurisdiction: "New York State",
    regulationBillName: "NY Paid Family Leave",
    chineseTitle: "纽约州带薪家庭假",
    englishTitle: "NY Paid Family Leave",
    agency: "NY Workers' Comp Board",
    applicabilityThreshold: "在纽约工作 30+ 天的 1 名员工起 1+ employee (30+ days)",
    status: "In effect",
    effectiveDate: "2018-01-01",
    keyRequirements: "最长 12 周、按平均周薪 67% 支付；由员工薪资按比例供款。",
    chineseSummary:
      "纽约州带薪家庭假为员工提供最长 12 周、按平均周薪 67%（2026 年每周上限约 $1,228.53）的带薪假，用于照护新生儿/家庭成员或军属事由，资金来自员工薪资扣款。雇用 1 名员工即须提供保险。",
    englishSummary:
      "NY Paid Family Leave provides up to 12 weeks at 67% of average weekly wage (2026 cap ~$1,228.53/wk) for bonding/family care/military events, funded by an employee payroll deduction. Coverage is required from the first employee.",
    businessImpact: "须为门店员工投保 PFL 并代扣供款。",
    enforcementRecord: "由纽约州工伤补偿委员会执法。",
    riskLevel: "中风险",
    topic: "sick_safe_leave",
    applicabilityRuleId: null,
    sourceUrl: "https://paidfamilyleave.ny.gov/",
    recommendedAction: "确认 PFL 保险与薪资扣款合规。",
  },
  {
    jurisdiction: "New York State",
    regulationBillName: "NY Paid Prenatal Personal Leave (Labor Law §196-b)",
    chineseTitle: "纽约州带薪产前假",
    englishTitle: "NY Paid Prenatal Leave",
    agency: "NY DOL",
    applicabilityThreshold: "所有纽约州私营雇主，不论规模 All NY employers",
    status: "In effect",
    effectiveDate: "2025-01-01",
    keyRequirements: "每 52 周提供 20 小时带薪产前假，独立于病假，无需累积。",
    chineseSummary:
      "纽约州自 2025-01-01 起率先要求所有私营雇主每 52 周为员工提供 20 小时带薪产前假，用于孕期医疗就诊，独立于普通病假且无需累积。",
    englishSummary:
      "Effective 2025-01-01, NY became the first state to require all private employers to provide 20 hours of paid prenatal leave per 52 weeks for pregnancy-related medical care, separate from sick leave and with no accrual.",
    businessImpact: "须为孕期员工预先提供 20 小时带薪产前假并更新考勤系统。",
    enforcementRecord: "NY DOL 执法（新法，记录有限）。",
    riskLevel: "中风险",
    topic: "sick_safe_leave",
    applicabilityRuleId: null,
    sourceUrl: "https://www.ny.gov/new-york-state-paid-prenatal-leave/paid-prenatal-leave-faqs",
    recommendedAction: "在休假政策与考勤系统中加入 20 小时带薪产前假。",
  },
  {
    jurisdiction: "New York State",
    regulationBillName: "NY Sexual Harassment Prevention Policy & Annual Training",
    chineseTitle: "纽约州反性骚扰政策与年度培训",
    englishTitle: "NY Sexual Harassment Prevention",
    agency: "NY DOL / NY DHR",
    applicabilityThreshold: "所有纽约州雇主，1 名员工起 All NY employers (1+)",
    status: "In effect",
    effectiveDate: "2019-10-09",
    keyRequirements: "书面政策 + 互动式年度培训；2026-01-01 起扩展至性侵与歧视内容；新员工 90 天内培训。",
    chineseSummary:
      "纽约州要求所有雇主制定书面反性骚扰政策并提供互动式年度培训；自 2026-01-01 起培训内容扩展至性侵与歧视，新员工须在入职 90 天内完成。",
    englishSummary:
      "NY requires all employers to maintain a written sexual-harassment-prevention policy and provide interactive annual training; from 2026-01-01 the training expands to cover sexual assault and discrimination, with new hires trained within 90 days.",
    businessImpact: "须每年培训每名门店员工并保存记录。",
    enforcementRecord: "NY DHR 调查骚扰投诉。",
    riskLevel: "中风险",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://www.ny.gov/programs/combating-sexual-harassment-workplace",
    recommendedAction: "落实年度互动培训与新员工 90 天内培训，保存完成记录。",
  },
  {
    jurisdiction: "Federal",
    regulationBillName: "FLSA Federal Minimum Wage & Overtime",
    chineseTitle: "联邦最低工资与加班（FLSA）",
    englishTitle: "FLSA Federal Minimum Wage & Overtime",
    agency: "US DOL Wage & Hour Division",
    applicabilityThreshold: "所有受 FLSA 涵盖的雇主 All covered employers",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "联邦最低工资 $7.25（被纽约 $17 取代）；非豁免员工每周 40 小时以上须按 1.5 倍支付加班。",
    chineseSummary:
      "FLSA 规定联邦最低工资 $7.25/小时（被纽约更高标准取代）与非豁免员工每周 40 小时以上 1.5 倍加班工资。barista 为非豁免岗位，须按周计算加班；错误分类为豁免存在风险。",
    englishSummary:
      "The FLSA sets a $7.25 federal minimum (preempted by NY's higher rate) and 1.5× overtime for non-exempt employees over 40 hours/week. Baristas are non-exempt — overtime accrues weekly; misclassifying them as exempt is a risk.",
    businessImpact: "门店排班与工资核算须正确计算每周加班，避免错误分类。",
    enforcementRecord: "DOL WHD 经常在餐饮业追缴加班欠薪。",
    riskLevel: "中风险",
    topic: "overtime_tip",
    applicabilityRuleId: null,
    sourceUrl: "https://www.dol.gov/agencies/whd/flsa",
    recommendedAction: "核查 barista 加班计算与豁免分类是否正确。",
  },
  {
    jurisdiction: "New York City",
    regulationBillName: "Required Federal/State/City Workplace Postings",
    chineseTitle: "强制工作场所张贴",
    englishTitle: "Required Workplace Postings",
    agency: "US DOL / NY DOL / NYC DCWP",
    applicabilityThreshold: "所有雇主（内容随适用法律而定）All employers",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "张贴 FLSA、EEO、FMLA、NY 最低工资、NY/NYC 病假、哺乳、公平工作周等告示（实体 + 电子）。",
    chineseSummary:
      "联邦、纽约州与纽约市要求雇主在工作场所张贴一系列法定告示（FLSA、EEO、FMLA、最低工资、病假、哺乳、公平工作周等），并日益要求同时电子张贴。缺失告示会被罚款。",
    englishSummary:
      "Federal, NY State and NYC require employers to post a set of mandatory notices (FLSA, EEO, FMLA, minimum wage, sick leave, lactation, Fair Workweek, etc.), increasingly required electronically too. Missing posters draw fines.",
    businessImpact: "每家门店需维护合规的告示墙与电子副本。",
    enforcementRecord: "DCWP/DOL 就缺失告示开具违规。",
    riskLevel: "中风险",
    topic: "posting",
    applicabilityRuleId: null,
    sourceUrl: "https://dol.ny.gov/all-employers",
    recommendedAction: "为每家门店配置完整告示墙并提供电子副本。",
  },
];

export type BuildingSeed = {
  jurisdiction: string;
  codeStandardName: string;
  chineseTitle: string;
  englishTitle: string;
  agency: string;
  codeCitation: string | null;
  status: string;
  effectiveDate: string | null;
  coveredEntities: string | null;
  keyRequirements: string | null;
  chineseSummary: string;
  englishSummary: string;
  businessImpact: string | null;
  inspectionCitationRecord: string | null;
  penalty: string | null;
  riskLevel: string;
  topic: string; // BuildingTopicEnum
  sourceUrl: string | null;
  recommendedAction: string | null;
};

export const buildingSeeds: BuildingSeed[] = [
  ...(buildingExtra as BuildingSeed[]),
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA General Industry Standards + General Duty Clause",
    chineseTitle: "OSHA 通用行业标准与一般责任条款",
    englishTitle: "OSHA General Industry Standards (29 CFR 1910) and General Duty Clause",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR 1910; OSH Act §5(a)(1)",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "所有私营雇主，含餐饮服务 All private-sector employers including food service",
    keyRequirements: "维护无公认危害的工作场所；湿滑/烫伤/机械/电气危害控制；伤害记录（300 表）；员工培训。",
    chineseSummary:
      "OSHA 通用行业标准与一般责任条款要求雇主维护无公认危害的工作场所，涵盖咖啡店常见的湿滑、烫伤、机械与电气风险。",
    englishSummary:
      "OSHA's general industry standards and the General Duty Clause require employers to maintain a workplace free of recognized hazards — covering slip/burn/machine/electrical risks common in cafés.",
    businessImpact: "影响门店安全流程、设备维护、伤害记录与员工培训。",
    inspectionCitationRecord: null,
    penalty: "严重违规每项最高约 $16,550；故意/重复每项最高约 $165,514（每年调整）。",
    riskLevel: "中风险",
    topic: "osha_safety",
    sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910",
    recommendedAction: "建立门店 OSHA 自查与伤害记录流程；针对烫伤/湿滑/电气危害开展培训。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Hazard Communication Standard (HazCom / GHS)",
    chineseTitle: "OSHA 危害通识标准（HazCom / GHS）",
    englishTitle: "OSHA Hazard Communication Standard",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR 1910.1200",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "使用危险化学品的雇主（门店清洁/消毒化学品）",
    keyRequirements: "化学品清单、安全数据表（SDS）可及、GHS 标签、员工危害通识培训。",
    chineseSummary:
      "HazCom 要求对工作场所危险化学品（如清洁/消毒剂）维护 SDS、正确标签并培训员工，咖啡店清洁化学品适用。",
    englishSummary:
      "HazCom requires maintaining safety data sheets, proper GHS labels, and training for workplace hazardous chemicals — applicable to café cleaning/sanitizing chemicals.",
    businessImpact: "影响门店化学品管理、SDS 存档与新员工培训。",
    inspectionCitationRecord: null,
    penalty: "并入 OSHA 罚则（严重/故意/重复）。",
    riskLevel: "中风险",
    topic: "osha_safety",
    sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200",
    recommendedAction: "建立门店化学品 SDS 库与 GHS 标签核查清单。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "ADA Title III — Public Accommodations",
    chineseTitle: "ADA 第三章 —— 公共场所无障碍",
    englishTitle: "ADA Title III — Public Accommodations (2010 ADA Standards)",
    agency: "US DOJ / ADA",
    codeCitation: "42 U.S.C. §12181 et seq.; 2010 ADA Standards for Accessible Design",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "公共场所，含咖啡店/餐厅 Places of public accommodation incl. cafés",
    keyRequirements: "无障碍入口、通道、柜台高度、卫生间；移除可行的障碍；无障碍数字点单。",
    chineseSummary:
      "ADA 第三章要求公共场所提供无障碍设施（入口、通道、柜台、卫生间），并日益涵盖网站/App 点单无障碍。",
    englishSummary:
      "ADA Title III requires public accommodations to be accessible (entrances, paths, counters, restrooms) and increasingly covers website/app ordering accessibility.",
    businessImpact: "影响门店设计/改造、柜台与卫生间布局，以及 App/网站无障碍。",
    inspectionCitationRecord: null,
    penalty: "民事处罚与私人诉讼（含网站无障碍诉讼）。",
    riskLevel: "中风险",
    topic: "ada",
    sourceUrl: "https://www.ada.gov/topics/title-iii/",
    recommendedAction: "在门店设计与 App 中纳入 ADA 无障碍核查；评估数字无障碍合规。",
  },
  {
    jurisdiction: "New York City",
    codeStandardName: "NYC Construction & Fire Codes — C of O and FDNY Permits",
    chineseTitle: "NYC 建筑与消防规范 —— 使用许可证与 FDNY 许可",
    englishTitle: "NYC Construction & Fire Codes — Certificate of Occupancy and FDNY Permits",
    agency: "NYC DOB / FDNY",
    codeCitation: "NYC Admin Code Title 28 (Construction) & Title 29 (Fire)",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "商业改造、聚集场所、抽油烟/灭火系统",
    keyRequirements: "合法使用许可证（C of O）、建筑许可、FDNY 聚集场所许可与灭火系统/抽油烟检验。",
    chineseSummary:
      "NYC 建筑与消防规范要求门店改造取得建筑许可与使用许可证，并就聚集场所、抽油烟与灭火系统取得 FDNY 许可与检验。",
    englishSummary:
      "NYC construction and fire codes require build-out permits and a certificate of occupancy, plus FDNY permits/inspections for assembly, exhaust hoods and fire-suppression systems.",
    businessImpact: "直接影响门店开业进度、改造合规与 FDNY 检验。",
    inspectionCitationRecord: null,
    penalty: "DOB/ECB 违规罚单；停工令（stop-work）。",
    riskLevel: "中风险",
    topic: "fire_code",
    sourceUrl: "https://www.nyc.gov/site/buildings/index.page",
    recommendedAction: "开业前核查 C of O、建筑许可与 FDNY 许可/检验是否齐全。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Emergency Action Plans",
    chineseTitle: "OSHA 紧急行动计划",
    englishTitle: "OSHA Emergency Action Plans",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR 1910.38",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "凡其他标准要求须有 EAP 的雇主（员工 ≤10 可口头）",
    keyRequirements: "书面紧急行动计划：疏散路线、警报、事故报告与责任分工；员工培训。",
    chineseSummary:
      "OSHA 紧急行动计划标准要求在其他标准触发时制定书面应急计划，涵盖疏散、警报与报告程序；员工 ≤10 人可口头传达。门店需有可张贴的疏散计划并培训员工。",
    englishSummary:
      "OSHA's Emergency Action Plan standard requires a written emergency plan (evacuation, alarm, reporting) where triggered by another standard; oral is allowed at ≤10 employees. Each store needs a posted evacuation plan and trained staff.",
    businessImpact: "门店须制定并张贴应急疏散计划并培训员工。",
    inspectionCitationRecord: null,
    penalty: "严重违规每项最高约 $16,550（每年调整）。",
    riskLevel: "中风险",
    topic: "osha_safety",
    sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.38",
    recommendedAction: "制定门店书面应急行动计划并开展疏散培训。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Portable Fire Extinguishers",
    chineseTitle: "OSHA 便携式灭火器",
    englishTitle: "OSHA Portable Fire Extinguishers",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR 1910.157",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "提供/依赖便携式灭火器的雇主",
    keyRequirements: "灭火器安装、可达、A 类行进距离 ≤75 英尺；年度维护 + 月度目视检查；员工培训。",
    chineseSummary:
      "OSHA 要求灭火器正确安装、易于取用、A 类行进距离不超过 75 英尺，并进行年度维护与月度目视检查，员工须受培训。咖啡店须配置并维护 ABC/K 类灭火器。",
    englishSummary:
      "OSHA requires extinguishers mounted, accessible, within 75 ft travel for Class A, with annual maintenance and monthly visual checks plus employee training. Cafés must mount and service ABC/K-class extinguishers.",
    businessImpact: "门店须配置/年检灭火器并培训员工使用。",
    inspectionCitationRecord: null,
    penalty: "严重违规每项最高约 $16,550（每年调整）。",
    riskLevel: "中风险",
    topic: "osha_safety",
    sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.157",
    recommendedAction: "落实灭火器年检/月检与员工培训。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Exit Routes",
    chineseTitle: "OSHA 疏散通道",
    englishTitle: "OSHA Exit Routes",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR 1910.36–.37",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "所有通用行业雇主",
    keyRequirements: "足够数量、无障碍、标识清晰、有照明的疏散通道；门内侧可开启。",
    chineseSummary:
      "OSHA 疏散通道标准要求保持足够数量、无障碍、标识清晰且有照明的出口，门可从内侧开启。后场堆物阻挡出口是常见违规。",
    englishSummary:
      "OSHA's exit-route standard requires an adequate number of unobstructed, marked, lit exit routes with doors openable from the inside. Blocked back-of-house exits are a common violation.",
    businessImpact: "门店须保持出口畅通、标识与照明合规。",
    inspectionCitationRecord: null,
    penalty: "严重违规最高约 $16,550；故意最高约 $165,514（每年调整）。",
    riskLevel: "中风险",
    topic: "osha_safety",
    sourceUrl: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XVII/part-1910/subpart-E",
    recommendedAction: "保持出口无堆物、标识清晰、应急照明可用。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Walking-Working Surfaces (slips/trips/falls)",
    chineseTitle: "OSHA 行走作业面（防滑跌倒）",
    englishTitle: "OSHA Walking-Working Surfaces",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR 1910.22 (Subpart D)",
    status: "In effect",
    effectiveDate: "2017-01-17",
    coveredEntities: "所有通用行业雇主",
    keyRequirements: "作业面保持清洁、干燥、有序；及时纠正危害；防滑跌倒控制。",
    chineseSummary:
      "OSHA 行走作业面标准要求地面清洁、干燥、有序并及时纠正危害。湿滑地面跌倒是咖啡店第一大工伤来源，需防滑垫与警示。",
    englishSummary:
      "OSHA's walking-working-surfaces standard requires clean, dry, orderly surfaces and prompt hazard correction. Slips on wet café floors are the #1 injury source — mats and signage are needed.",
    businessImpact: "门店须落实防滑措施（防滑垫、警示牌、及时清理）。",
    inspectionCitationRecord: null,
    penalty: "严重违规每项最高约 $16,550（每年调整）。",
    riskLevel: "中风险",
    topic: "osha_safety",
    sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.22",
    recommendedAction: "部署防滑垫、湿滑警示与即时清理流程。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Electrical",
    chineseTitle: "OSHA 电气安全",
    englishTitle: "OSHA Electrical Safety",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR 1910 Subpart S (1910.301–.308)",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "所有通用行业雇主",
    keyRequirements: "安全设计与布线；近水处 GFCI；不得电路过载；带电部件防护。",
    chineseSummary:
      "OSHA 电气标准要求安全布线、近水处设置 GFCI、避免电路过载并防护带电部件。咖啡机/磨豆机/热水设备靠近水槽，须 GFCI 与安全接线。",
    englishSummary:
      "OSHA's electrical standards require safe wiring, GFCI near water, no overloaded circuits, and guarding of live parts. Espresso/grinder/hot-water equipment near sinks needs GFCI and safe wiring.",
    businessImpact: "门店电气改造与设备须符合 GFCI/接线/防过载要求。",
    inspectionCitationRecord: null,
    penalty: "严重违规每项最高约 $16,550（每年调整）。",
    riskLevel: "中风险",
    topic: "osha_safety",
    sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910SubpartS",
    recommendedAction: "确认近水设备 GFCI 保护与电路负载合规。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Personal Protective Equipment (PPE)",
    chineseTitle: "OSHA 个人防护装备",
    englishTitle: "OSHA PPE General Requirements",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR 1910.132",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "存在需 PPE 危害的雇主",
    keyRequirements: "危害评估；提供并要求使用适当 PPE（防割/隔热手套、防滑鞋政策等）。",
    chineseSummary:
      "OSHA PPE 标准要求进行危害评估并提供适当个人防护装备。咖啡店涉及切割（防割手套）、高温（隔热手套）与清洁化学品（手套）等防护需求。",
    englishSummary:
      "OSHA's PPE standard requires a hazard assessment and provision of appropriate PPE. Café hazards include cuts (cut gloves), heat at espresso/ovens (heat protection) and cleaning chemicals (gloves).",
    businessImpact: "门店须评估危害并提供相应 PPE。",
    inspectionCitationRecord: null,
    penalty: "严重违规每项最高约 $16,550（每年调整）。",
    riskLevel: "中风险",
    topic: "osha_safety",
    sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.132",
    recommendedAction: "完成门店 PPE 危害评估并配发防割/隔热/化学防护装备。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Injury & Illness Recordkeeping",
    chineseTitle: "OSHA 工伤与疾病记录",
    englishTitle: "OSHA Injury & Illness Recordkeeping",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "29 CFR Part 1904",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "员工 >10 的雇主，但有限服务餐饮（NAICS 722513）部分豁免",
    keyRequirements: "维护 OSHA 300/301/300A 记录；但有限服务餐饮部分豁免，严重事故报告（1904.39）仍适用于所有。",
    chineseSummary:
      "OSHA 记录标准要求 >10 名员工的雇主维护 300/301/300A 工伤日志，但有限服务餐饮（NAICS 722513）属部分豁免清单，无需 300 日志；然而死亡/住院/截肢等严重事故报告对所有雇主仍然适用。",
    englishSummary:
      "OSHA recordkeeping requires >10-employee employers to keep 300/301/300A logs, but limited-service restaurants (NAICS 722513) are on the partial-exemption list and need not keep the 300 log; severe-incident reporting still applies to all.",
    businessImpact: "门店通常免于 300 日志，但仍须报告严重事故。",
    inspectionCitationRecord: null,
    penalty: "报告违规最高约 $16,550（每年调整）。",
    riskLevel: "信息参考",
    topic: "osha_safety",
    sourceUrl: "https://www.osha.gov/laws-regs/regulations/standardnumber/1904/1904.2",
    recommendedAction: "确认 NAICS 豁免适用；建立严重事故 8/24 小时报告流程。",
  },
  {
    jurisdiction: "Federal",
    codeStandardName: "OSHA Heat Injury & Illness Prevention (proposed)",
    chineseTitle: "OSHA 高温伤害与疾病预防（拟议）",
    englishTitle: "OSHA Heat Injury & Illness Prevention (proposed)",
    agency: "Federal OSHA (US DOL)",
    codeCitation: "NPRM (future 29 CFR 1910 Subpart)",
    status: "Proposed",
    effectiveDate: null,
    coveredEntities: "若最终成文，涵盖室内外通用行业雇主",
    keyRequirements: "拟议高温指数 80°F 触发初始措施、90°F 触发高温措施：书面计划、监测、饮水、休息、适应、培训。",
    chineseSummary:
      "OSHA 拟议的高温伤害与疾病预防规则（2024 年 NPRM，尚未成文）将在高温指数达 80°F 触发书面热计划、监测、饮水与休息，90°F 触发高温措施。若成文，门店烤箱/咖啡机附近室内区域可能触发。",
    englishSummary:
      "OSHA's proposed Heat Injury & Illness Prevention rule (2024 NPRM, not finalized) would trigger a written heat plan, monitoring, water and rest at a heat index of 80°F, and high-heat measures at 90°F. If finalized, indoor café areas near ovens/espresso could trip the trigger.",
    businessImpact: "目前仅为关注项；若成文，门店高温区域需热计划与休息安排。",
    inspectionCitationRecord: null,
    penalty: "拟议中（暂无）。",
    riskLevel: "关注",
    topic: "osha_safety",
    sourceUrl: "https://www.federalregister.gov/documents/2025/09/25/2025-18670/heat-injury-and-illness-prevention-in-outdoor-and-indoor-work-settings",
    recommendedAction: "持续监控 OSHA 高温规则进展；评估门店高温区域。",
  },
  {
    jurisdiction: "New York City",
    codeStandardName: "NFPA 96 Commercial Kitchen Exhaust & Fire Suppression",
    chineseTitle: "商业厨房排油烟与灭火（NFPA 96）",
    englishTitle: "NFPA 96 Commercial Kitchen Exhaust & Fire Suppression",
    agency: "FDNY / NYC DOB",
    codeCitation: "NFPA 96 (adopted via NYC Fire/Mechanical Code)",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "产生含油脂蒸气的商业烹饪场所（按烹饪量定清洗频率）",
    keyRequirements: "UL300 湿化学抽油烟罩灭火系统；按烹饪量定期清洗烟罩/风道（月度→年度）；检验。",
    chineseSummary:
      "NFPA 96（经 NYC 消防/机械规范采纳）要求产生含油脂蒸气的商业烹饪场所配置 UL300 湿化学抽油烟罩灭火系统并定期清洗烟罩/风道。仅在瑞幸有热食/油脂烹饪时触发，纯咖啡/即取即走可能豁免——需核实菜单。",
    englishSummary:
      "NFPA 96 (adopted via NYC code) requires UL300 wet-chemical hood suppression and periodic hood/duct cleaning for establishments with grease-producing cooking. Triggered only if Luckin does hot-food/grease cooking; pure espresso/grab-and-go may be exempt — verify the menu.",
    businessImpact: "若门店有热食烹饪，须配抽油烟罩灭火系统并定期清洗。",
    inspectionCitationRecord: null,
    penalty: "DOB/FDNY 违规 + ECB 罚款（视情节）。",
    riskLevel: "中风险",
    topic: "fire_code",
    sourceUrl: "https://up.codes/viewer/new_york_city/nfpa-96-2021",
    recommendedAction: "核实门店烹饪方式；如涉油脂烹饪，配置并定期清洗抽油烟罩灭火系统。",
  },
  {
    jurisdiction: "New York City",
    codeStandardName: "NYC DOB Sign Permit",
    chineseTitle: "NYC 招牌许可证",
    englishTitle: "NYC DOB Sign Permit",
    agency: "NYC DOB",
    codeCitation: "NYC Construction Code §28-105.1",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "安装 >6 平方英尺或任何带照明招牌的企业",
    keyRequirements: "DOB 招牌许可证（DOB NOW: Build）+ 持牌招牌安装；带照明须电气许可与年度续期。",
    chineseSummary:
      "NYC 要求安装超过 6 平方英尺或任何带照明招牌须取得 DOB 招牌许可证并由持牌安装商施工；带照明招牌还需电气许可与年度续期。瑞幸带照明店招/挑出招牌须办理。",
    englishSummary:
      "NYC requires a DOB sign permit (DOB NOW: Build) and a licensed sign hanger for signs over 6 sq ft or any illuminated sign, plus an electrical permit and annual renewal if illuminated. Luckin's illuminated storefront/blade signs require permits.",
    businessImpact: "门店店招须办理 DOB 招牌许可与持牌安装。",
    inspectionCitationRecord: null,
    penalty: "ECB 违规，通常每个无证招牌 $500–$2,500。",
    riskLevel: "中风险",
    topic: "permit_co",
    sourceUrl: "https://www.nyc.gov/site/buildings/property-or-business-owner/sign-permit.page",
    recommendedAction: "为门店店招办理 DOB 招牌许可与电气许可。",
  },
  {
    jurisdiction: "New York City",
    codeStandardName: "NYC Backflow Prevention / Cross-Connection Control",
    chineseTitle: "NYC 防回流装置",
    englishTitle: "NYC Backflow Prevention Device",
    agency: "NYC DEP",
    codeCitation: "15 RCNY; NYC Plumbing Code",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "有交叉连接风险的餐饮/商业厨房（咖啡机、碳酸化设备、洗碗机）",
    keyRequirements: "由 PE/RA 编制并经 DEP 批准的计划；持牌水管工安装；NYS 认证人员年度测试。",
    chineseSummary:
      "NYC DEP 要求有交叉连接风险的餐饮场所安装经批准的防回流装置并由 NYS 认证人员每年测试。咖啡机与碳酸化设备是典型回流源，每店须配置装置并年检。",
    englishSummary:
      "NYC DEP requires food-service establishments with cross-connection hazards to install an approved backflow-prevention device and have it tested annually by a NYS-certified tester. Espresso machines and carbonators are classic backflow sources — a device and annual test per store.",
    businessImpact: "门店咖啡机/碳酸设备须配防回流装置并年度测试。",
    inspectionCitationRecord: null,
    penalty: "DEP 执法；供水违规罚款。",
    riskLevel: "中风险",
    topic: "building_code",
    sourceUrl: "https://www.nyc.gov/site/dep/about/cross-connection-controls.page",
    recommendedAction: "为门店安装防回流装置并安排 NYS 认证年度测试。",
  },
  {
    jurisdiction: "New York City",
    codeStandardName: "NYC Accessibility (Building Code Chapter 11)",
    chineseTitle: "NYC 无障碍设施（建筑规范第 11 章）",
    englishTitle: "NYC Accessibility (Building Code Ch. 11)",
    agency: "NYC DOB",
    codeCitation: "NYC Building Code Ch. 11 (ICC A117.1)",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "公共场所的新建与改造",
    keyRequirements: "无障碍入口、通道、卫生间与柜台高度，符合 ICC A117.1；纳入 DOB 图纸审查/使用许可。",
    chineseSummary:
      "NYC 建筑规范第 11 章要求公共场所的新建与改造满足无障碍要求（入口、通道、卫生间、柜台高度），并在 DOB 图纸审查与使用许可中落实，与 ADA 第三章在市级层面衔接。",
    englishSummary:
      "NYC Building Code Chapter 11 requires new construction and alterations of public-accommodation spaces to meet accessibility (entrance, route, restroom, counter heights) per ICC A117.1, enforced through DOB plan exam / C of O and tying to ADA Title III at the city level.",
    businessImpact: "门店改造须满足第 11 章无障碍要求方可取得使用许可。",
    inspectionCitationRecord: null,
    penalty: "DOB 异议 / 不予发放使用许可。",
    riskLevel: "中风险",
    topic: "ada",
    sourceUrl: "https://www.nyc.gov/assets/buildings/local_laws/ll58of1987.pdf",
    recommendedAction: "门店设计/改造纳入第 11 章无障碍核查。",
  },
  {
    jurisdiction: "New York City",
    codeStandardName: "NYC Place of Assembly Certificate of Operation",
    chineseTitle: "NYC 公共集会场所证书",
    englishTitle: "NYC Place of Assembly Certificate",
    agency: "FDNY / NYC DOB",
    codeCitation: "NYC Construction & Fire Codes",
    status: "In effect",
    effectiveDate: null,
    coveredEntities: "室内聚集 75 人以上的场所（室外 200 人）",
    keyRequirements: "DOB 公共集会场所使用证 + 年度 FDNY PA 许可 + 检查。",
    chineseSummary:
      "当室内聚集人数达 75 人及以上时，须取得 DOB 公共集会场所使用证并办理年度 FDNY 许可与检查。多数即取即走的瑞幸门店座位 <75，可能不适用；较大堂食门店需逐店核实人数。",
    englishSummary:
      "Premises where 75+ persons gather indoors require a DOB Place of Assembly Certificate of Operation plus an annual FDNY permit and inspection. Most grab-and-go Luckin cafés seat <75 (likely N/A); larger seated stores must verify occupancy per location.",
    businessImpact: "座位较多的门店若达 75 人须办理集会场所证书；多数小店不适用。",
    inspectionCitationRecord: null,
    penalty: "FDNY/DOB 违规；无证经营属严重违规。",
    riskLevel: "关注",
    topic: "permit_co",
    sourceUrl: "https://www.nyc.gov/site/buildings/property-or-business-owner/place-of-assembly-certificate-of-operation.page",
    recommendedAction: "逐店核实室内容纳人数；≥75 人的门店办理集会场所证书。",
  },
];

export type EnvironmentSeed = {
  jurisdiction: string;
  regulationName: string;
  chineseTitle: string;
  englishTitle: string;
  agency: string;
  applicabilityThreshold: string | null;
  status: string;
  effectiveDate: string | null;
  keyRequirements: string | null;
  chineseSummary: string;
  englishSummary: string;
  businessImpact: string | null;
  riskLevel: string;
  topic: string; // EnvTopicEnum
  applicabilityRuleId: string | null;
  sourceUrl: string | null;
  recommendedAction: string | null;
};

export const environmentSeeds: EnvironmentSeed[] = [
  ...(environmentExtra as EnvironmentSeed[]),
  {
    jurisdiction: "New York City",
    regulationName: "NYC DEP Fats, Oils & Grease (FOG) Best Management Practices",
    chineseTitle: "NYC DEP 油脂（FOG）最佳管理规范",
    englishTitle: "NYC DEP Fats, Oils & Grease (FOG) BMP",
    agency: "NYC DEP",
    applicabilityThreshold: "所有排放油脂的餐饮场所；隔油设备规模按 DEP 规定（具体门槛待核实）",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "安装并维护隔油器/隔油池；保留清掏记录；自 2021-09-25 起禁止食物垃圾液化器排入下水道。",
    chineseSummary:
      "NYC DEP 要求餐饮场所安装并维护隔油设备以控制油脂排入下水道，并禁止使用食物垃圾液化器排放。具体规模门槛需向 DEP 核实。",
    englishSummary:
      "NYC DEP requires food-service establishments to install and maintain grease interceptors to control FOG discharge, and bans food-waste-liquefier sewer discharge (since 2021-09-25). Exact size cutoffs to verify with DEP.",
    businessImpact: "影响门店厨房设备、隔油器维护与清掏记录。",
    riskLevel: "中风险",
    topic: "wastewater_fog",
    applicabilityRuleId: "nyc_fog",
    sourceUrl: "https://www.nyc.gov/site/dep/water/grease-traps.page",
    recommendedAction: "核实各门店隔油设备规模与清掏记录是否符合 DEP 要求。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Commercial Organics Separation (Local Law 146 of 2013)",
    chineseTitle: "NYC 商业有机垃圾分类（2013 年第 146 号地方法）",
    englishTitle: "NYC Commercial Organics Separation (Local Law 146 of 2013)",
    agency: "NYC DSNY",
    applicabilityThreshold: "连锁餐饮：同城 2 处以上合计 8,000 平方英尺以上，或单店 7,000 平方英尺以上",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "源头分离有机垃圾；使用持牌运输商或现场处理；保留记录。",
    chineseSummary:
      "NYC 地方法 146 要求达到规模门槛的餐饮连锁源头分离有机垃圾。瑞幸 NYC 在岗门店合计约 21,156 平方英尺，已超过 8,000 平方英尺连锁门槛。",
    englishSummary:
      "NYC Local Law 146 requires covered food-service chains above the size thresholds to source-separate organics. Luckin's open NYC footprint (~21,156 sq ft combined) exceeds the 8,000 sq ft chain threshold.",
    businessImpact: "适用：需为 NYC 门店建立有机垃圾分类流程并签约持牌运输商。",
    riskLevel: "中风险",
    topic: "organics_compost",
    applicabilityRuleId: "nyc_organics_chain",
    sourceUrl: "https://www.nyc.gov/assets/dsny/site/services/food-scraps-and-yard-waste-page/overview-commercial-organics",
    recommendedAction: "为 NYC 门店部署有机垃圾源头分离与持牌运输商合约，并留存记录。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Commercial Waste Zones + Trade Waste Hauler Licensing (BIC)",
    chineseTitle: "NYC 商业垃圾分区与运输商许可（BIC）",
    englishTitle: "NYC Commercial Waste Zones and Trade Waste Hauler Licensing",
    agency: "NYC DSNY / BIC",
    applicabilityThreshold: "使用私营运输的所有商户须使用分区内 BIC 持牌运输商",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "使用指定商业垃圾分区内的 BIC 持牌运输商；遵守计费与服务标准。",
    chineseSummary:
      "NYC 商业垃圾分区（CWZ）改革要求商户使用其所在分区内的 BIC 持牌运输商；BIC 负责运输商许可与监管。",
    englishSummary:
      "NYC's Commercial Waste Zones reform requires businesses to use a BIC-licensed hauler within their assigned zone; BIC licenses and oversees private carters.",
    businessImpact: "影响门店垃圾清运合约选择与计费。",
    riskLevel: "信息参考",
    topic: "trade_waste_hauler",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/assets/dsny/site/our-work/reduce/commercial-waste-zones",
    recommendedAction: "确认门店所在商业垃圾分区并签约 BIC 持牌运输商。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Commercial Recycling Source Separation (Local Law 87/1992)",
    chineseTitle: "NYC 商业回收源头分类",
    englishTitle: "NYC Commercial Recycling (Paper/Metal/Glass/Plastic)",
    agency: "NYC DSNY",
    applicabilityThreshold: "所有商业场所 All commercial establishments",
    status: "In effect",
    effectiveDate: "2016-08-01",
    keyRequirements: "将金属/玻璃/塑料与纸/纸板从垃圾中源头分离；贴标分类桶 + 张贴标识；通过私营运输商回收。",
    chineseSummary:
      "NYC 要求所有商业场所将金属/玻璃/塑料与纸/纸板从垃圾中源头分离，使用贴标分类桶并张贴标识，通过私营运输商回收。这是每家门店的基础义务。",
    englishSummary:
      "NYC requires all commercial establishments to source-separate metal/glass/plastic and paper/cardboard from trash, use labeled bins with posted signage, and recycle via a private carter. A baseline obligation for every store.",
    businessImpact: "每家门店须设置分类桶、张贴标识并合规回收。",
    riskLevel: "中风险",
    topic: "recycling",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/site/dsny/businesses/businesses-recycling.page",
    recommendedAction: "为门店配置贴标分类桶与标识，落实回收流程。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Single-Use EPS Foam Ban (Local Law 142/2013)",
    chineseTitle: "NYC 泡沫塑料禁令",
    englishTitle: "NYC Expanded Polystyrene Foam Ban",
    agency: "NYC DSNY",
    applicabilityThreshold: "所有餐饮场所与商店（年收入 <$50 万可申请豁免）",
    status: "In effect",
    effectiveDate: "2019-01-01",
    keyRequirements: "不得持有、销售或提供一次性 EPS 泡沫杯、盘、托、餐盒与散装填充物。",
    chineseSummary:
      "NYC 禁止餐饮场所与商店持有、销售或提供一次性发泡聚苯乙烯（EPS）泡沫杯、盘、餐盒与散装填充物。瑞幸不得使用泡沫杯/容器，须改用合规杯盖。",
    englishSummary:
      "NYC bars food-service establishments and stores from possessing, selling or offering single-use expanded-polystyrene foam cups, plates, trays, clamshells and loose fill. Luckin cannot use foam cups/containers and must switch to compliant cups/lids.",
    businessImpact: "门店杯盖/容器不得使用泡沫塑料，须改用合规材料。",
    riskLevel: "中风险",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/assets/dsny/site/our-work/reduce-reuse-recycle/foam-ban",
    recommendedAction: "确认门店杯/盖/容器均不含 EPS 泡沫。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC \"Skip the Stuff\" — Foodware Accessories on Request (Local Law 6/2023)",
    chineseTitle: "NYC 餐具按需提供",
    englishTitle: "NYC Skip-the-Stuff (Foodware Accessories on Request)",
    agency: "NYC DSNY / DCWP",
    applicabilityThreshold: "提供外带/外卖的餐饮场所",
    status: "In effect",
    effectiveDate: "2024-07-01",
    keyRequirements: "除非顾客主动要求/勾选，不得随外带/外卖提供一次性餐具、餐巾、调料包。",
    chineseSummary:
      "NYC「Skip the Stuff」规则要求外带/外卖除非顾客主动要求或在线勾选，否则不得附带一次性餐具、餐巾与调料包。瑞幸须更新 POS/App 默认设置为「按需提供」。",
    englishSummary:
      "NYC's Skip-the-Stuff rule bars including single-use utensils, napkins and condiment packets with takeout/delivery unless the customer requests or opts in. Luckin must set POS/app defaults to request-only.",
    businessImpact: "门店与 App 须默认不附带餐具/餐巾，改为按需提供。",
    riskLevel: "中风险",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/assets/dsny/site/our-work/reduce-reuse-recycle/skip-the-stuff",
    recommendedAction: "将门店与 App 外带默认改为「按需提供」餐具/餐巾。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Plastic Straw & Stirrer on Request (Local Law 64/2020)",
    chineseTitle: "NYC 塑料吸管按需提供",
    englishTitle: "NYC Plastic Straw-on-Request",
    agency: "NYC DCWP / DSNY",
    applicabilityThreshold: "所有餐饮场所 All food-service establishments",
    status: "In effect",
    effectiveDate: "2021-11-01",
    keyRequirements: "除非顾客要求，不主动提供塑料吸管/搅拌棒；须备少量非可降解吸管以满足无障碍需求；张贴告示。",
    chineseSummary:
      "NYC 要求餐饮场所除非顾客要求否则不主动提供塑料吸管与搅拌棒，但须备少量非可降解吸管以满足残障人士的无障碍需求，并张贴告示。",
    englishSummary:
      "NYC requires food-service establishments not to automatically provide plastic straws/stirrers unless requested, while keeping some non-compostable straws available for accessibility (ADA) requests, with signage.",
    businessImpact: "门店不主动提供塑料吸管，但须保留无障碍用吸管。",
    riskLevel: "低风险",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/site/dca/about/plastic-straws.page",
    recommendedAction: "门店吸管改为按需提供，保留无障碍用吸管并张贴告示。",
  },
  {
    jurisdiction: "New York State",
    regulationName: "NYS Bag Waste Reduction Act (Plastic Bag Ban)",
    chineseTitle: "纽约州塑料袋减量法",
    englishTitle: "NYS Plastic Bag Ban",
    agency: "NYSDEC",
    applicabilityThreshold: "须收取纽约州销售税的商家",
    status: "In effect",
    effectiveDate: "2020-10-19",
    keyRequirements: "禁止一次性塑料提袋；适用地区纸袋收取 5 美分费用。",
    chineseSummary:
      "纽约州塑料袋减量法禁止提供一次性塑料提袋；在采纳纸袋费的地区纸袋收取 5 美分。瑞幸零售提袋须为纸袋或可重复使用袋。",
    englishSummary:
      "NYS's Bag Waste Reduction Act bans single-use plastic carryout bags; a 5¢ paper-bag fee applies where adopted. Luckin's retail bags must be paper or reusable, not banned plastic film.",
    businessImpact: "门店提袋须为纸袋/可重复使用袋并处理纸袋费。",
    riskLevel: "低风险",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://dec.ny.gov/environmental-protection/recycling-composting/bag-waste-reduction-law",
    recommendedAction: "门店提袋改为纸袋/可重复使用袋，按地区处理纸袋费。",
  },
  {
    jurisdiction: "Federal",
    regulationName: "EPA Refrigerant Management (CAA Section 608)",
    chineseTitle: "EPA 制冷剂管理（第 608 条）",
    englishTitle: "EPA Refrigerant Management (Section 608)",
    agency: "EPA",
    applicabilityThreshold: "服务制冷/空调设备的所有者/操作者与技师（≥50 磅充注触发泄漏修复）",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "不得排放制冷剂；须持证技师；大型设备泄漏修复与记录。",
    chineseSummary:
      "EPA 第 608 条禁止排放制冷剂，要求由持证技师维修制冷/空调设备，对充注 ≥50 磅的大型设备适用泄漏修复与记录。咖啡店小型设备通常低于 50 磅，但不得排放的规定始终适用。",
    englishSummary:
      "EPA Section 608 bans venting refrigerants, requires certified technicians for refrigeration/AC service, and applies leak-repair/recordkeeping to appliances with ≥50 lb charge. Small café units are usually below 50 lb, but the no-venting rule always applies.",
    businessImpact: "门店制冷/空调维修须用 EPA 持证技师；不得排放制冷剂。",
    riskLevel: "信息参考",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://www.epa.gov/section608",
    recommendedAction: "使用 EPA 608 持证技师维修制冷设备并保存记录。",
  },
  {
    jurisdiction: "Federal",
    regulationName: "EPA Antimicrobial (Sanitizer/Disinfectant) Registration — FIFRA",
    chineseTitle: "EPA 消毒杀菌剂注册（FIFRA）",
    englishTitle: "EPA FIFRA Sanitizer & Disinfectant Registration",
    agency: "EPA",
    applicabilityThreshold: "使用作出杀菌宣称的消毒/杀菌剂者",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "仅使用 EPA 注册的消毒/杀菌剂；遵循标签用法；食品接触消毒剂符合 40 CFR 180.940。",
    chineseSummary:
      "FIFRA 要求仅使用 EPA 注册的消毒/杀菌剂并严格遵循标签用法与接触时间；食品接触面消毒剂须符合 40 CFR 180.940 豁免容差。门店清洁消毒须用合规产品。",
    englishSummary:
      "FIFRA requires using only EPA-registered sanitizers/disinfectants per label directions and contact times; food-contact sanitizers must meet 40 CFR 180.940. Café cleaning/sanitizing must use compliant products.",
    businessImpact: "门店消毒/清洁须使用 EPA 注册、食品接触合规产品。",
    riskLevel: "低风险",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://www.epa.gov/pesticide-registration/determining-if-cleaning-product-pesticide-under-fifra",
    recommendedAction: "核查门店消毒剂为 EPA 注册且食品接触合规，培训按标签用法使用。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Noise Code (Equipment / HVAC)",
    chineseTitle: "NYC 噪音法规（设备/暖通）",
    englishTitle: "NYC Noise Code (Equipment/HVAC)",
    agency: "NYC DEP",
    applicabilityThreshold: "所有商业场所/设备（暖通在地界 45 dB(A) 限值）",
    status: "In effect",
    effectiveDate: "2007-07-01",
    keyRequirements: "设备（暖通、压缩机）与音乐不得超过噪音限值；循环设备在地界有分贝限制。",
    chineseSummary:
      "NYC 噪音法规要求暖通、压缩机等设备与播放音乐不得超过噪音限值，循环设备在地界/相邻住宅处限 45 dB(A)。屋顶/外部暖通与制冷冷凝器须达标。",
    englishSummary:
      "NYC's Noise Code requires equipment (HVAC, compressors) and music not to exceed code limits, with circulation devices limited to 45 dB(A) at the property line/adjacent residence. Rooftop/exterior HVAC and refrigeration condensers must comply.",
    businessImpact: "门店外部暖通/制冷设备须满足地界噪音限值。",
    riskLevel: "低风险",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/site/dep/environment/noise-code.page",
    recommendedAction: "评估门店外部设备噪音是否满足 45 dB(A) 地界限值。",
  },
  {
    jurisdiction: "New York State",
    regulationName: "NYS Returnable Container Act (Bottle Bill)",
    chineseTitle: "纽约州容器押金法",
    englishTitle: "NYS Bottle Bill (Container Deposit)",
    agency: "NYSDEC",
    applicabilityThreshold: "销售受涵盖瓶装饮料的经销商（水、汽水、啤酒、碳酸饮料；咖啡不在内）",
    status: "In effect",
    effectiveDate: null,
    keyRequirements: "对受涵盖容器收取 5 美分押金；接受所售饮料容器退还并对账。",
    chineseSummary:
      "纽约州容器押金法要求销售受涵盖瓶装饮料（水、汽水、碳酸饮料等）的经销商收取 5 美分押金并接受退还。即饮咖啡通常不在涵盖范围——仅当瑞幸销售受涵盖瓶装水/汽水时适用，须核实产品结构。",
    englishSummary:
      "NYS's Bottle Bill requires dealers selling covered bottled beverages (water, soda, carbonated drinks) to collect a 5¢ deposit and accept returns. Ready-to-drink coffee is generally not covered — applies only if Luckin sells covered bottled water/soda; verify product mix.",
    businessImpact: "仅当门店销售受涵盖瓶装饮料时适用押金与退还义务。",
    riskLevel: "信息参考",
    topic: "other",
    applicabilityRuleId: null,
    sourceUrl: "https://dec.ny.gov/environmental-protection/recycling-composting/bottle-bill",
    recommendedAction: "核实是否销售受涵盖瓶装饮料；如有，落实押金与退还对账。",
  },
];

export type ConsumerSeed = {
  jurisdiction: string;
  regulationName: string;
  chineseTitle: string;
  englishTitle: string;
  agency: string;
  applicabilityThreshold: string | null;
  keyRequirements: string | null;
  complaintEnforcementRecord: string | null;
  status: string;
  effectiveDate: string | null;
  chineseSummary: string;
  englishSummary: string;
  riskLevel: string;
  topic: string; // ConsumerTopicEnum
  applicabilityRuleId: string | null;
  sourceUrl: string | null;
  recommendedAction: string | null;
};

export const consumerSeeds: ConsumerSeed[] = [
  ...(consumerExtra as ConsumerSeed[]),
  {
    jurisdiction: "New York City",
    regulationName: "NYC Refund Policy Posting Rule (6 RCNY §5-37)",
    chineseTitle: "NYC 退款政策张贴规则（6 RCNY §5-37）",
    englishTitle: "NYC Refund Policy Posting Rule",
    agency: "NYC DCWP",
    applicabilityThreshold: "面向消费者销售商品的零售/餐饮场所",
    keyRequirements: "在店内显眼处张贴退款政策；未张贴则消费者可在 30 天内退货。",
    complaintEnforcementRecord: null,
    status: "In effect",
    effectiveDate: null,
    chineseSummary:
      "NYC DCWP 要求商家在显眼处张贴退款政策；若未张贴，消费者有权在购买后 30 天内退货退款。",
    englishSummary:
      "NYC DCWP requires merchants to conspicuously post their refund policy; if none is posted, consumers may return goods within 30 days of purchase.",
    riskLevel: "中风险",
    topic: "refund_posting",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/site/dca/about/consumer-protection-law.page",
    recommendedAction: "在各门店与点单界面显眼处张贴/展示退款政策。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Consumer Protection Law — Pricing & Signage (6 RCNY Ch. 5)",
    chineseTitle: "NYC 消费者保护法 —— 标价与告示",
    englishTitle: "NYC Consumer Protection Law — Pricing & Signage",
    agency: "NYC DCWP",
    applicabilityThreshold: "面向消费者的商户",
    keyRequirements: "明确标价、避免误导性定价与广告；遵守告示与单品标价规则。",
    complaintEnforcementRecord: "DCWP 经常对零售/餐饮商户进行单品标价与告示检查并处罚。",
    status: "In effect",
    effectiveDate: null,
    chineseSummary:
      "NYC 消费者保护法禁止不公平或误导性的商业行为，并就标价、告示与广告设定要求；DCWP 进行检查与执法。",
    englishSummary:
      "NYC's Consumer Protection Law bars unfair/deceptive practices and sets pricing, signage and advertising requirements; DCWP inspects and enforces.",
    riskLevel: "中风险",
    topic: "signage_pricing",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/site/dca/about/consumer-protection-law.page",
    recommendedAction: "核查门店与 App 的标价、促销与告示是否清晰、无误导。",
  },
  {
    jurisdiction: "Federal",
    regulationName: "FTC Act §5 — Unfair or Deceptive Acts or Practices",
    chineseTitle: "FTC 法第 5 条 —— 不公平或欺骗性行为",
    englishTitle: "FTC Act Section 5 — Unfair or Deceptive Acts or Practices",
    agency: "FTC",
    applicabilityThreshold: "所有企业（联邦基线）",
    keyRequirements: "禁止不公平或欺骗性的商业行为，含广告、定价与订阅/会员条款。",
    complaintEnforcementRecord: null,
    status: "In effect",
    effectiveDate: null,
    chineseSummary:
      "FTC 法第 5 条禁止不公平或欺骗性的商业行为，是联邦层面的消费者保护基线，涵盖广告、定价与会员/订阅条款。",
    englishSummary:
      "FTC Act Section 5 prohibits unfair or deceptive acts or practices — the federal consumer-protection baseline covering advertising, pricing and subscription/membership terms.",
    riskLevel: "信息参考",
    topic: "deceptive_practices",
    applicabilityRuleId: null,
    sourceUrl: "https://www.ftc.gov/legal-library/browse/statutes/federal-trade-commission-act",
    recommendedAction: "审查 App 会员/订阅、促销与广告表述，确保不构成误导。",
  },
  {
    jurisdiction: "New York State",
    regulationName: "NY Credit Card Surcharge Disclosure (GBL §518)",
    chineseTitle: "纽约州信用卡附加费披露法（双重定价）",
    englishTitle: "NY Credit Card Surcharge Disclosure",
    agency: "NY Dept. of State / DCWP",
    applicabilityThreshold: "所有对刷卡加收附加费的纽约州商家",
    keyRequirements: "须先标示最高（信用卡）总价；附加费不得超过刷卡处理成本；结账时不得突然加价。",
    complaintEnforcementRecord: "每次违规最高 $500；由州务厅/DCWP 执法。",
    status: "In effect",
    effectiveDate: "2024-02-11",
    chineseSummary:
      "纽约州自 2024-02-11 起要求对刷卡加收附加费的商家先标示最高（信用卡）总价，附加费不得超过刷卡处理成本，且不得在结账时突然加价。对瑞幸 App/POS 至关重要：若加收附加费须事先全额展示信用卡价。",
    englishSummary:
      "Since 2024-02-11, NY requires sellers imposing card surcharges to post the highest (credit) total price, cap the surcharge at processing cost, and not add a surprise surcharge at checkout. Critical for Luckin's app/POS — if surcharging, show the full credit price up front.",
    riskLevel: "高风险",
    topic: "signage_pricing",
    applicabilityRuleId: null,
    sourceUrl: "https://dos.ny.gov/credit-card-surcharge-guidance",
    recommendedAction: "若 App/POS 加收刷卡附加费，确保事先展示信用卡总价并封顶至处理成本。",
  },
  {
    jurisdiction: "Federal",
    regulationName: "ADA Title III — Website/App Accessibility (Public Accommodation)",
    chineseTitle: "ADA 第三章（网站/App 无障碍）",
    englishTitle: "ADA Title III — Website/App Accessibility",
    agency: "US DOJ (private suits)",
    applicabilityThreshold: "公共场所（含餐饮点单网站/App）",
    keyRequirements: "点单网站/App 须无障碍；法院普遍以 WCAG 2.1 AA 为事实标准。",
    complaintEnforcementRecord: "Robles v. Domino's（第九巡回 2019）确认餐饮 App 须无障碍；每年逾 3,000 起网站无障碍诉讼。",
    status: "In effect",
    effectiveDate: null,
    chineseSummary:
      "ADA 第三章经判例适用于公共场所的网站与 App。瑞幸以预点单 App/网站为核心，是无障碍诉讼的高暴露目标；法院普遍以 WCAG 2.1 AA 作为事实标准。Robles v. Domino's 确认餐饮点单 App 必须无障碍。",
    englishSummary:
      "ADA Title III applies via case law to public-accommodation websites and apps. Luckin's order-ahead app/site is a high-exposure litigation target; courts apply WCAG 2.1 AA as the de facto standard. Robles v. Domino's confirmed a restaurant ordering app must be accessible.",
    riskLevel: "高风险",
    topic: "deceptive_practices",
    applicabilityRuleId: null,
    sourceUrl: "https://www.ada.gov/resources/web-guidance/",
    recommendedAction: "对点单 App/网站进行 WCAG 2.1 AA 无障碍审计与整改。",
  },
  {
    jurisdiction: "New York State",
    regulationName: "NY Automatic Renewal Law (GBL §527-a)",
    chineseTitle: "纽约州自动续费法",
    englishTitle: "NY Automatic Renewal Law",
    agency: "NY AG / DCWP",
    applicabilityThreshold: "提供自动续费消费计划的商家",
    keyRequirements: "清晰显著披露自动续费；取得明确同意；提供便捷的线上取消；续费提醒。",
    complaintEnforcementRecord: "由纽约州检察长就消费者保护提起执法。",
    status: "In effect",
    effectiveDate: "2021-02-09",
    chineseSummary:
      "纽约州自动续费法要求对自动续费的消费计划清晰显著披露条款、取得明确同意、提供便捷线上取消并发送续费提醒。若瑞幸推出付费自动续费会员/订阅则适用。",
    englishSummary:
      "NY's Automatic Renewal Law requires clear/conspicuous disclosure, affirmative consent, easy online cancellation and renewal reminders for auto-renewing consumer plans. Applies if Luckin offers a paid auto-renewing membership/subscription.",
    riskLevel: "中风险",
    topic: "deceptive_practices",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nysenate.gov/legislation/laws/GBS/527-A",
    recommendedAction: "如有自动续费会员，落实显著披露、明确同意与一键取消。",
  },
  {
    jurisdiction: "New York State",
    regulationName: "NY Gift Card Rules (GBL §396-i)",
    chineseTitle: "纽约州礼品卡规则",
    englishTitle: "NY Gift Card Rules",
    agency: "NY DCP / AG",
    applicabilityThreshold: "销售礼品卡/礼券的商家",
    keyRequirements: "最低 9 年有效期（2022-12-10 起发行）；不得收取不活跃/服务费；余额 <$5 可兑现。",
    complaintEnforcementRecord: "由纽约州检察长执法。",
    status: "In effect",
    effectiveDate: "2022-12-10",
    chineseSummary:
      "纽约州礼品卡规则要求 2022-12-10 起发行的礼品卡至少 9 年有效、不得收取不活跃或服务费，余额低于 5 美元可要求兑现。若瑞幸销售礼品卡/储值，须遵守上述条款。",
    englishSummary:
      "NY's gift-card rules require a minimum 9-year term (cards issued on/after 2022-12-10), no inactivity/service fees, and cash-out of balances under $5. If Luckin sells gift cards/stored value, these terms apply.",
    riskLevel: "低风险",
    topic: "deceptive_practices",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nysenate.gov/legislation/laws/GBS/396-I",
    recommendedAction: "如销售礼品卡，确认有效期 ≥9 年、无不活跃费并支持小额兑现。",
  },
  {
    jurisdiction: "New York State",
    regulationName: "NY SHIELD Act (Data Security & Breach Notification)",
    chineseTitle: "纽约州 SHIELD 法（数据安全与泄露通知）",
    englishTitle: "NY SHIELD Act",
    agency: "NY AG",
    applicabilityThreshold: "持有纽约州居民私人信息的任何企业",
    keyRequirements: "采取合理数据安全措施；发生泄露须通知（2024 修订要求发现后 30 天内）。",
    complaintEnforcementRecord: "纽约州检察长就数据安全失职达成和解。",
    status: "In effect",
    effectiveDate: "2020-03-21",
    chineseSummary:
      "纽约州 SHIELD 法要求持有纽约居民私人信息的企业采取合理数据安全措施，并在数据泄露时通知（2024 修订要求发现后 30 天内）。瑞幸 App 收集顾客 PII/支付数据，须维护安全措施与泄露应急预案。",
    englishSummary:
      "NY's SHIELD Act requires businesses holding NY residents' private information to maintain reasonable data safeguards and to notify on a breach (30 days post-discovery per the 2024 amendment). Luckin's app collects customer PII/payment data, so safeguards and a breach plan are required.",
    riskLevel: "中风险",
    topic: "complaints",
    applicabilityRuleId: null,
    sourceUrl: "https://ag.ny.gov/internet/data-breach",
    recommendedAction: "维护合理数据安全措施与泄露通知预案，覆盖 App 顾客数据。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Item Pricing & Price-Scanner Rules (Admin Code §20-708)",
    chineseTitle: "NYC 单品定价与扫描器规则",
    englishTitle: "NYC Item Pricing & Price-Scanner Rules",
    agency: "NYC DCWP",
    applicabilityThreshold: "销售带标签商品的零售店（30 英尺内有扫描器可豁免）",
    keyRequirements: "单品标价或合规扫描器；多重标价按最低价销售。",
    complaintEnforcementRecord: "DCWP 进行单品定价检查并罚款。",
    status: "In effect",
    effectiveDate: null,
    chineseSummary:
      "NYC 要求零售店对带标签商品单品标价，或在 30 英尺内提供合规价格扫描器；同一商品有多重标价时须按最低价销售。适用于店内销售的袋装咖啡豆、瓶装饮品等包装零售商品。",
    englishSummary:
      "NYC requires retail stores to item-price tagged goods or provide a qualifying price scanner within 30 ft; multi-priced items must be sold at the lowest price. Applies to packaged retail goods sold in-store (bagged beans, bottled drinks).",
    riskLevel: "低风险",
    topic: "signage_pricing",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/site/dca/businesses/pricing-rules.page",
    recommendedAction: "对店内包装零售商品落实单品标价或合规扫描器。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC Weights & Measures Device Inspection",
    chineseTitle: "NYC 度量衡器具检验",
    englishTitle: "NYC Weights & Measures Device Inspection",
    agency: "NYC DCWP",
    applicabilityThreshold: "使用商业称重/计量器具的企业（仅当按重量/计量销售时）",
    keyRequirements: "DCWP 年度称具检验；器具须准确；每台 $20–$100。",
    complaintEnforcementRecord: "DCWP 查封不准确的称具。",
    status: "In effect",
    effectiveDate: null,
    chineseSummary:
      "NYC 要求使用商业称重/计量器具的企业接受 DCWP 年度检验并保持器具准确。仅当瑞幸在 POS 按重量销售（如按重量计价的咖啡豆）时触发；固定价格饮品不适用。",
    englishSummary:
      "NYC requires businesses using commercial weighing/measuring devices to pass annual DCWP inspection and keep devices accurate. Triggered only if Luckin sells by weight at POS (e.g., beans priced by weight); not for fixed-price drinks.",
    riskLevel: "信息参考",
    topic: "licensing",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/site/dca/businesses/inspections-weights-measures.page",
    recommendedAction: "核实是否按重量销售；如有，安排 DCWP 称具年度检验。",
  },
  {
    jurisdiction: "Federal",
    regulationName: "FTC Negative Option / \"Click-to-Cancel\" Rule",
    chineseTitle: "FTC 负面选项/“一键取消”规则（已被撤销）",
    englishTitle: "FTC Click-to-Cancel Rule",
    agency: "FTC",
    applicabilityThreshold: "提供订阅/自动续费的商家",
    keyRequirements: "规则已被第八巡回法院于 2025-07-08 撤销（程序原因）；FTC 重启规则制定，ROSCA 执法继续。",
    complaintEnforcementRecord: "第八巡回法院 2025 年 7 月撤销该规则。",
    status: "Repealed",
    effectiveDate: null,
    chineseSummary:
      "FTC 的负面选项/“一键取消”规则已于 2025-07-08 被第八巡回法院以程序原因撤销，目前不具约束力；FTC 正重启规则制定，ROSCA 执法继续。若瑞幸推出付费订阅/会员，应持续关注。",
    englishSummary:
      "The FTC's Negative Option / Click-to-Cancel rule was vacated by the 8th Circuit on 2025-07-08 (procedural) and is not currently binding; the FTC is restarting rulemaking and ROSCA enforcement continues. Monitor if Luckin launches a paid subscription/membership.",
    riskLevel: "关注",
    topic: "deceptive_practices",
    applicabilityRuleId: null,
    sourceUrl: "https://www.ftc.gov/legal-library/browse/rules/negative-option-rule",
    recommendedAction: "持续关注 FTC 订阅规则重启；如有订阅业务，遵循 ROSCA 与州法。",
  },
  {
    jurisdiction: "New York City",
    regulationName: "NYC DCWP Consumer Complaint Process",
    chineseTitle: "NYC DCWP 消费者投诉处理机制",
    englishTitle: "NYC DCWP Consumer Complaint Process",
    agency: "NYC DCWP",
    applicabilityThreshold: "所有可能被投诉的 NYC 企业",
    keyRequirements: "DCWP 受理/调解消费者投诉；企业须回应问询/检查。",
    complaintEnforcementRecord: "DCWP 的调解与裁决是常规流程。",
    status: "In effect",
    effectiveDate: null,
    chineseSummary:
      "NYC DCWP 受理并调解消费者投诉，企业须回应 DCWP 的问询与检查。瑞幸将收到 DCWP 转来的投诉，须及时回应并整改以避免升级。",
    englishSummary:
      "NYC DCWP receives and mediates consumer complaints; businesses must respond to inquiries/inspections. Luckin will receive DCWP complaint forwards and must respond and cure to avoid escalation.",
    riskLevel: "信息参考",
    topic: "complaints",
    applicabilityRuleId: null,
    sourceUrl: "https://www.nyc.gov/site/dca/consumers/file-complaint.page",
    recommendedAction: "建立 DCWP 投诉响应流程，及时回应并整改。",
  },
];
