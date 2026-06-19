# AI 食品安全技术信息及舆情监控模型需求说明书（v2）
# AI Food Safety Regulatory Intelligence & Public Sentiment Monitoring Model — Requirements (v2)

> v2 在 v1 基础上细化，新增第一阶段重点地区、咖啡馆/重点品牌聚焦、违规标准化分类、双语月报结构与预警阈值。**两者冲突时以 v2 为准。**

## 一、项目目标 Project Objectives
建立一个 AI 食品安全技术信息及舆情监控模型，用于持续监控美国联邦、州及重点地方政府公开渠道中的食品安全、法规标准、监管执法、食品召回、食源性疾病事件、地方餐饮卫生检查结果、咖啡馆检查扣分项及相关产品负面舆情信息。

模型应能够自动或半自动完成数据抓取、筛选、去重、分类、摘要、翻译、风险评级、趋势分析和月报生成，并最终形成中英双语食品安全信息月报。

重点目标：

1. 持续监控美国食品安全相关政策法规、监管动态、标准变更和执法趋势；
2. 持续监控 FDA、USDA / FSIS、CDC、州及地方监管部门发布的食品召回、食品安全警示和食源性疾病事件；
3. 抓取重点地方 DOH、Health Department、Environmental Health 或 Agriculture Department 餐饮检查数据库中的检查结果、扣分项、违规项和等级结果；
4. **地方餐饮检查模块以咖啡馆、咖啡连锁、饮品店、轻食咖啡门店为主要抓取对象，不做所有餐厅全量监控，除非甲方另行指定；**
5. 对重点咖啡及快餐竞品品牌门店的检查结果进行月度跟踪和横向对比；
6. 对食品安全事件、法规变化、召回信息、咖啡馆检查高风险结果及负面舆情进行风险评级；
7. 自动生成中英双语月报；
8. 对高风险事件或重大监管变化触发专项预警；
9. 支持历史数据追溯、趋势分析和后续管理决策。

## 二、监控范围 Monitoring Scope
### 2.1 地理范围 Geographic Scope
1. 美国联邦层面；
2. 美国各州；
3. 甲方门店、仓库、供应链、进口业务或销售区域涉及的重点城市、县及地方监管辖区；
4. 重点咖啡馆、饮品店及快餐竞品品牌所在市场。

### 2.2 第一阶段重点地区 Phase I Priority Jurisdictions
| 区域 Region | 城市 / 州 / 县 City / State / County | 数据源类型 Data Source Type |
|---|---|---|
| New York | New York City | NYC DOH / ABCEats / NYC Open Data |
| New Jersey | Bergen County | Bergen County DHS / NWBRHC / Local Health Department / OPRA |
| New Jersey | Newark | Newark Health Inspection Lookup / Newark Food & Drug Bureau |
| California | Los Angeles County | LA County Public Health Environmental Health |
| California | San Francisco | My Health Department / SF DPH |
| Massachusetts | Boston | Analyze Boston / Mayor's Food Court |
| Massachusetts | Cambridge | Cambridge Open Data Sanitary Inspections |
| Washington, DC | District of Columbia | DC Health Food Establishment Inspection Reports |
| Florida | Statewide / FDACS-regulated entities | FDACS Food Permit Center |

## 三、地方餐饮检查对象范围 Local Restaurant Inspection Scope
### 3.1 主要抓取对象 Primary Establishment Types
1. 咖啡馆 / Coffee Shops；
2. 咖啡连锁门店 / Coffee Chains；
3. 饮品店 / Beverage Shops；
4. 奶茶、冷饮、果汁及 smoothie 门店 / Bubble Tea, Juice and Smoothie Shops；
5. 含轻食销售的咖啡门店 / Cafés with Light Food；
6. 烘焙咖啡店 / Bakery Cafés；
7. 快餐咖啡竞品门店 / Quick-service competitors with coffee or beverage operations；
8. 甲方指定门店、仓库、测试厨房或供应链相关食品经营实体。

### 3.2 非主要抓取对象 Secondary / Excluded Scope
除非甲方另行指定，模型不需要全量抓取：普通中餐馆；普通西餐厅；酒吧；full-service restaurants；非咖啡/非饮品为主的普通餐饮门店；与甲方业务、咖啡饮品、轻食或竞品品牌无明显关联的餐饮场所。

### 3.3 可纳入例外范围 Exception Scope
即使不是咖啡馆，出现以下情况也可纳入监控：与甲方供应商/原料/包装/仓储相关；涉及同类产品（奶基饮品、冷萃咖啡、即饮饮品、轻食、烘焙产品）；发生重大食品安全事件；被监管机构处罚或关闭；被媒体报道并引发食品安全负面舆情；甲方特别指定需要监控。

## 四、重点品牌监控 Priority Brand Monitoring
重点监控以下咖啡、饮品及快餐相关品牌：

1. Starbucks；
2. Dunkin / Dunkin'；
3. Pret A Manger / Pret Coffee；
4. Blue Bottle Coffee；
5. McDonald's；
6. 甲方品牌及甲方指定门店；
7. 其他甲方后续指定的咖啡馆、饮品店或轻食品牌。

### 4.1 品牌别名匹配表 Brand Alias Matching Table
| 标准品牌 Standard Brand | 匹配关键词 Matching Keywords |
|---|---|
| Starbucks | STARBUCKS, STARBUCKS COFFEE |
| Dunkin | DUNKIN, DUNKIN', DUNKIN DONUTS |
| Pret A Manger | PRET A MANGER, PRET, PRET COFFEE |
| Blue Bottle Coffee | BLUE BOTTLE, BLUE BOTTLE COFFEE |
| McDonald's | MCDONALD'S, MCDONALDS, MC DONALD'S |
| Luckin Coffee | LUCKIN, LUCKIN COFFEE |

## 七、地方餐饮检查筛选逻辑 Local Inspection Filtering Logic
> （沿用原文编号；五、六章节在来源中未列出。）

### 7.1 第一优先级：指定品牌 Direct Brand Match
优先抓取：Starbucks；Dunkin；Pret A Manger / Pret Coffee；Blue Bottle Coffee；McDonald's；Luckin Coffee；甲方指定品牌或门店。

### 7.2 第二优先级：咖啡馆 / 饮品店关键词匹配 Café Keyword Match
如数据库支持全量或半全量检索，可抓取名称中包含以下关键词的门店：COFFEE；CAFE；CAFÉ；ESPRESSO；ROASTERY；BOBA；BUBBLE TEA；JUICE；SMOOTHIE；BEVERAGE；BAKERY CAFE；TEA SHOP。

### 7.3 第三优先级：甲方业务相关实体 Business-Relevant Entities
即使不是咖啡馆，也应抓取：甲方门店；甲方仓库；甲方测试厨房；甲方供应商；甲方配送或 3PL 食品经营实体；与甲方产品/原料/包装/进口业务相关的食品经营实体。

### 7.4 排除逻辑 Exclusion Logic
除非出现重大食品安全事件或甲方指定，不应抓取：与咖啡/饮品/轻食无关的普通餐馆；full-service restaurants；酒吧；夜店；非食品安全相关投诉或纯服务类差评；与甲方业务无关的低风险信息。

## 八、违规项标准化分类 Standardized Violation Categories
| No. | 中文分类 Chinese Category | English Category |
|---|---|---|
| 1 | 冷藏温度控制 | Cold Holding Temperature Control |
| 2 | 热保温温度控制 | Hot Holding Temperature Control |
| 3 | 食品来源和标签 | Food Source and Labeling |
| 4 | 过敏原控制 | Allergen Control |
| 5 | 员工洗手和个人卫生 | Employee Handwashing and Personal Hygiene |
| 6 | 交叉污染 | Cross-Contamination |
| 7 | 食品接触面清洁消毒 | Food Contact Surface Cleaning and Sanitizing |
| 8 | 食品储存 | Food Storage |
| 9 | 设备设施维护 | Equipment and Facility Maintenance |
| 10 | 虫害控制 | Pest Control |
| 11 | 污水、排水和管道 | Sewage, Drainage and Plumbing |
| 12 | 化学品储存 | Chemical Storage |
| 13 | 垃圾管理 | Waste Management |
| 14 | 食品保护 | Food Protection |
| 15 | 证照、食品经理证书及文件记录 | Permits, Food Manager Certification and Records |
| 16 | 食品加工、制备或冷却流程 | Food Processing, Preparation or Cooling Process |
| 17 | 冰机、饮品设备及管路卫生 | Ice Machine, Beverage Equipment and Lines Sanitation |
| 18 | 牛奶、奶基原料及冷藏饮品管理 | Milk, Dairy-Based Ingredients and Refrigerated Beverage Control |
| 19 | 其他卫生管理问题 | Other Sanitation Issues |

## 九、月报输出结构 Monthly Report Output Structure
最终报告应生成中英双语 Excel 文件，结构类似历史月报，并增加地方咖啡馆检查结果模块。

### 9.1 工作表一：食品安全信息月报-美国 Sheet 1: Food Safety Information Monthly Report — U.S.
| 中文字段 | English Field |
|---|---|
| 序号 | No. |
| 类别 | Category |
| 中文标题 | Chinese Title |
| 英文标题 | English Title |
| 来源 | Source |
| 发布日期 | Publication Date |
| 原文中文摘要 | Chinese Summary |
| 英文摘要 | English Summary |
| 原文链接 | Source URL |
| 风险等级 | Risk Level |
| 相关性说明 | Relevance Notes |
| 建议行动 | Recommended Action |

### 9.2 工作表二：美国咖啡馆及重点品牌检查结果 Sheet 2: U.S. Café and Priority Brand Inspection Results
| 中文字段 | English Field |
|---|---|
| 序号 | No. |
| 地区 | Jurisdiction |
| 监管机构 | Regulatory Agency |
| 品牌 | Brand |
| 门店类型 | Establishment Type |
| 门店名称 | Store Name |
| 地址 | Address |
| 检查日期 | Inspection Date |
| 检查类型 | Inspection Type |
| 检查结果 | Inspection Result |
| 分数 | Score |
| 等级 | Grade |
| 违规代码 | Violation Code |
| 中文违规摘要 | Chinese Violation Summary |
| 英文违规摘要 | English Violation Summary |
| 违规严重程度 | Violation Severity |
| 标准化违规类别 | Standardized Violation Category |
| 是否需复查 | Follow-up Required |
| 数据来源方式 | Source Type |
| 风险等级 | Risk Level |
| 原文链接 / 文件编号 | Source URL / Document Reference |
| 建议行动 | Recommended Action |

### 9.3 工作表三：字段说明 Sheet 3: Field Guide
| 字段名称 Field Name | 说明 Description | 填写规则 Input Rule |
|---|---|---|
| （逐字段列出）| 字段含义 | 填写规范 |

## 十、重大事件预警机制 Critical Alert Mechanism
除月度报告外，模型应具备重大事件识别和预警能力。

### 10.1 餐饮检查预警触发条件 Restaurant Inspection Alert Triggers
发现以下情况时，应触发专项预警：

- 咖啡馆或重点品牌门店出现关闭、停业、Permit Suspension、Stop Sale、Imminent Health Hazard；
- NYC 门店 Score ≥ 28、Grade Pending 或 C；
- LA County 门店 Grade C、Score < 80 或关闭；
- San Francisco 门店 Closed、Failed 或 Conditional Pass；
- Boston / Cambridge 门店 Fail、Closed、Permit Suspension 或需紧急复查；
- DC 门店 Fail 或多个 Priority Violations；
- Florida FDACS 检查出现 Stop Sale、Closure、Permit Suspension 或 Imminent Health Hazard；
- Newark 门店出现 Unsatisfactory / Fail、embargo、condemnation、closure、permit suspension 或 foodborne illness investigation；
- Bergen County 门店出现 Unsatisfactory / Fail、multiple critical violations、紧急复查或执法行动；
- 出现虫害、污水倒流、冷藏温度失控、热保温不足、生熟交叉污染、洗手设施不可用等重大食品安全问题；
- 咖啡馆重复出现冰机、牛奶、饮品设备、冷藏温度、清洁消毒或虫害问题；
- 同一品牌或同一区域重复出现同类违规；
- 甲方门店、竞品咖啡门店或供应链相关实体被媒体报道并形成负面舆情。

## 十一、系统实现补充要求 Additional System Implementation Requirements
### 11.1 NJ 特殊处理要求 New Jersey Special Handling
由于 New Jersey 未发现统一 statewide 餐馆检查数据库，模型应：

- 通过地址识别 municipality；
- 判断 local health department 或 regional health commission；
- 优先使用在线查询入口；
- 无在线数据库时标记为 OPRA / Manual Request Required；
- 对 OPRA、PDF、扫描件、邮件回复或人工导入报告进行结构化处理；
- 在月报中显示 Source Type；
- 不得将 NJ 数据源缺失误判为"无检查"；
- 对无法获取的数据应标注"未找到公开数据库 / Data not publicly available online"。

### 11.2 咖啡馆专项分析 Café-Specific Analysis
模型应对咖啡馆类门店额外关注以下风险：冷藏牛奶温度；开封后保存时间；奶基原料变质；冰机清洁；饮品设备、咖啡机、奶管、糖浆管路卫生；搅拌机、奶泡机、冷萃桶清洁消毒；交叉污染；员工洗手；三槽水池/洗碗机；虫害控制；轻食加热、冷藏和保质期；过敏原交叉接触；标签和日期标识。

## 十二、整合后地方数据源清单 Local Data Source Summary
| 区域 Region | 城市/州/县 Jurisdiction | 数据源 Data Source | 推荐接入方式 Access Method | 主要抓取对象 Main Target |
|---|---|---|---|---|
| New York | NYC | ABCEats + NYC Open Data | Open Data API / 批量抓取 | 咖啡馆、重点品牌、甲方门店 |
| New Jersey | Bergen County | Bergen County DHS Consumer Health + NWBRHC + Municipality OPRA | Local Health Department / OPRA / 人工导入 | 咖啡馆、重点品牌、甲方 NJ 实体 |
| New Jersey | Newark | Newark Health Inspection Lookup + Food & Drug Bureau | 查询页 / 浏览器自动化 / 人工复核 | 咖啡馆、重点品牌、甲方门店 |
| California | Los Angeles County | LA County Environmental Health / ezsearch | 查询页 / Open Data / 浏览器自动化 | 咖啡馆、饮品店、重点品牌 |
| California | San Francisco | My Health Department San Francisco | 查询页 / 浏览器自动化 / 人工导出 | 咖啡馆、重点品牌 |
| Massachusetts | Boston | Analyze Boston + Mayor's Food Court | Open Data + 人工核验 | 咖啡馆、重点品牌、甲方门店 |
| Massachusetts | Cambridge | Cambridge Open Data Sanitary Inspections | Open Data API / 批量抓取 | 咖啡馆、重点品牌 |
| Washington, DC | DC | DC Health Food Establishment Inspection Reports | 查询页 / PDF / HTML 报告 | 咖啡馆、重点品牌 |
| Florida | Statewide / FDACS | FDACS Food Permit Center | 查询页 / 表单搜索 / 浏览器自动化 | coffee shops、bakeries、juice/smoothie bars、food warehouses |
