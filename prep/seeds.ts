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
