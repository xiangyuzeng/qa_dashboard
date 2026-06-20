/**
 * Curated seed rows transcribed VERBATIM from the client's 2026-05 bilingual report
 * (Import/Export + State/Local Regulation sheets). These are REAL, dated, sourced items —
 * not fabricated. collect.ts merges them with live auto-collected rows (Federal Register
 * import slugs, RSS sentiment). Manual-curated rows are fully bilingual (zh + en).
 *
 * To refresh: re-run live collectors, or edit these from the next monthly report.
 */

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
      "DCWP 已就快餐业公平工作周达成多起执法和解（行业内最高达数千万美元级城市范围和解）。",
    riskLevel: "中风险",
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
    applicabilityThreshold: "在 NYC 有员工的雇主；员工 ≥ 5 人（或净收入 ≥ $100 万）触发带薪累积",
    status: "In effect",
    effectiveDate: "2014-04-01",
    keyRequirements: "按工时累积安全/病假；雇主须提供书面政策并在工资单上显示累积余额；不得报复。",
    chineseSummary:
      "NYC ESSTA 要求在 NYC 有员工的雇主提供安全与病假，员工达 5 人以上须为带薪。任何有员工的门店均适用。",
    englishSummary:
      "NYC's Earned Safe and Sick Time Act requires employers with NYC employees to provide safe/sick leave; paid accrual applies at 5+ employees. Any establishment with staff is covered.",
    businessImpact: "对所有 NYC 门店用工政策、考勤与工资单系统均有直接影响。",
    enforcementRecord: "DCWP 定期就病假政策缺失、报复及未支付累积进行处罚。",
    riskLevel: "中风险",
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
    status: "Monitoring",
    effectiveDate: null,
    keyRequirements: "小费抵扣须满足告知与最低工资保障；2021 年 80/20/30 规则已被第五巡回法院于 2024 年撤销，持续关注后续规则。",
    chineseSummary:
      "联邦 FLSA 小费规则规范小费抵扣与双重工作。2021 年 80/20/30 最终规则已被法院撤销；瑞幸以预点单/外带为主，若不使用小费抵扣则相关性较低。",
    englishSummary:
      "Federal FLSA tip rules govern tip credits and dual jobs. The 2021 80/20/30 final rule was vacated by the 5th Circuit in 2024. As an order-ahead/takeout model that likely takes no tip credit, relevance to Luckin is limited.",
    businessImpact: "若不采用小费抵扣，影响较低；保留监控以防业务模式或法规变化。",
    enforcementRecord: null,
    riskLevel: "信息参考",
    topic: "overtime_tip",
    applicabilityRuleId: null,
    sourceUrl: "https://www.dol.gov/agencies/whd/flsa/tips",
    recommendedAction: "确认是否使用小费抵扣；持续监控 DOL 后续小费规则。",
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
];
