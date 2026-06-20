# 月度数据自动刷新 — 操作指南（GitHub Action）

本文档说明如何配置并使用仓库中的定时数据刷新工作流
`.github/workflows/monthly-refresh.yml`。该工作流每月自动重新拉取数据、校验、导出，
并默认以 **Pull Request（PR）** 的形式提交，等待人工审核后合并部署（合并即触发 Vercel 部署）。

> 说明：界面按钮/菜单名称（Settings、Actions、Run workflow 等）保持英文，因为 GitHub 界面默认即为英文；
> 代码、命令、Secret 名称、网址均为原文，请勿翻译或改动。

---

## 第 0 部分 —（建议）先在本地跑一遍流程

在依赖 CI 之前，先在本机确认整条流程可用。在仓库根目录执行：

```bash
# 一次性：确保 Python 导出依赖已安装
pip3 install openpyxl python-docx

# 运行与 Action 完全相同的流水线：
npm run prep:collect    # 重新拉取实时数据源（FDA、Federal Register、NYC、Boston、RSS…）
npm run prep:enrich     # 重新补充 OATH 多机构执法数据 + 自有门店 CAMIS 关联
npm run prep:domains    # 从 seeds 重建 4 个合规领域
npm run prep:meta       # 重新计算 meta.json 计数
npm run prep:validate   # 硬性校验门控 —— 数据异常即失败
npm run prep:export     # 重新生成 Excel + Word 报告
```

若 `prep:validate` 末尾显示 **"All /data/v2 files valid."**，说明流水线健康。
随后执行 `git checkout data public/exports` 丢弃本地改动（真正的刷新交给 Action 完成）。
若只想一键自检，`npm run prep:build` 会按 collect → enrich → meta → validate → export 顺序执行。

---

## 第 1 部分 — 一次性仓库设置（在 GitHub 网页端完成，仅需一次）

### 1a. 允许 Action 创建 PR 并推送（**必做**）

不做这一步，PR 步骤会因权限不足而失败。

1. 打开仓库：**https://github.com/xiangyuzeng/qa_dashboard**
2. 点击顶部的 **Settings** 标签页（仓库最右侧）。
3. 左侧栏 **Code and automation** 下，点击 **Actions → General**。
4. 滚动到底部的 **Workflow permissions** 区域。
5. 选中单选项 **"Read and write permissions"**。
6. 勾选 **"Allow GitHub Actions to create and approve pull requests"**。
7. 点击 **Save** 保存。

### 1b. 以 Secrets 形式添加采集器 API 密钥（可选）

没有的密钥可以跳过 —— 对应采集器会保持休眠（0 行记录 + `/sources` 页面上一条诚实的"未采集"说明，
绝不伪造数据）。Action 所依赖的 NYC 执法/检查数据源**无需密钥**，因此即使一个 Secret 都不加也能正常运行。

添加步骤：

1. 仍在 **Settings**，左侧栏点击 **Secrets and variables → Actions**。
2. 点击绿色按钮 **New repository secret**。
3. 在 **Name** 填入下表中的**精确名称**，在 **Secret** 粘贴你的密钥取值，点击 **Add secret**。
4. 对每个你拥有的密钥重复以上步骤。

> ⚠️ 安全提示：Secret 的**取值是你在各服务商账户中自行生成的私密凭证**。
> 请**只**把它粘贴进 GitHub 的 Secret 输入框，**切勿**粘贴到聊天、邮件或任何公开位置。
> GitHub 保存后不再显示取值（只能覆盖、无法读回），这是正常现象。

---

## 第 2 部分 — 首次手动运行（安全的 "PR" 模式）

1. 仓库 → 点击顶部 **Actions** 标签页。
2. 左侧栏点击工作流 **"Monthly data refresh"**。
3. 右侧点击 **Run workflow** 下拉按钮。
4. 保持 **Branch: main**，并**不要勾选** **"Commit straight to main…"**
   （这是安全模式：只会创建 PR，不会改动 `main`）。
5. 点击绿色的 **Run workflow** 按钮。
6. 约 5 秒后页面出现新的运行记录（需要可手动刷新）。点进去可实时查看各步骤，约 3–6 分钟完成。

**成功标志：** 每个步骤都打勾，最后一步 "Open review PR" 创建出一个 Pull Request。
若本次没有数据变化，会输出 "No data changes this run." 并跳过 PR —— 这也是正常的。

---

## 第 3 部分 — 审核 PR 并部署

这一步就是**人工审核门控**（对应 RUNBOOK 第 3 步）—— 也是默认走 PR 的全部意义所在。

1. 点击 **Pull requests** 标签页 → 打开 **"Data refresh — review before deploy"**（来自 `data-refresh` 分支）。
2. 点击 **Files changed** 标签查看 diff。
3. 重点检查 `data/v2/*.json` 的改动：
   - **是否出现刷屏式暴涨** —— 例如 `regulatory.json` 不应从约 167 行突然涨到上千行
     （FSIS 数据源偶尔会过量拉取）。若某项计数明显异常，**不要合并**，先排查数据源。
   - **是否有不合理记录** —— 任何看起来畸形或像伪造的行。
   - `prep:validate` 与 `npm run build` 已在 CI 通过（PR 上会显示绿色对勾），所以你审核的是
     **内容质量**，而非语法格式。
4. 确认无误后，点击 **Merge pull request → Confirm merge**。
5. **Vercel 自动部署**该次合并；在 Vercel 控制台可查看部署进度，线上站点约 1–2 分钟更新。

若发现问题，直接 **Close**（关闭）PR 而不合并即可（如有提示，可删除 `data-refresh` 分支）——
`main` 分支不受任何影响。

---

## 第 4 部分 — 每月自动计划

- 完成第 1a 步、且工作流已在 `main` 上（现已推送）后，它会在**每月 1 号 06:00 UTC** 自动运行。
- 每次定时运行与你的手动测试完全一致：刷新 → 校验 → **创建 PR**。它**不会**自动部署 ——
  需要有人审核后合并 PR。
- 定时运行可在 **Actions** 标签页查看，生成的 PR 可在 **Pull requests** 标签页查看
  （PR 创建时 GitHub 会邮件通知仓库 watcher）。

> 注意：GitHub 仅从**默认分支**（`main`）运行定时工作流；若仓库约 60 天无活动，定时任务可能被延迟或暂停 ——
> 手动跑一次即可重置。

---

## 第 5 部分 — 可选：无人值守部署（跳过人工审核）

当你信任该流水线、希望它无需人工合并即可部署时：

- **仅本次运行：** 在**第 2 部分第 4 步**中，运行前**勾选** **"Commit straight to main…"**。
  它会把刷新后的数据直接提交到 `main` → Vercel 立即部署。
- **让*定时*运行也自动部署：** 这需要改一行工作流代码（定时触发无法传入该输入项），
  告诉我，我来调整工作流的条件判断。之所以默认走"先审核"，是因为文档提示 FSIS 数据源偶尔会
  冲垮精心维护的数据快照。

**修改运行频率**（例如改为每周）：编辑 `.github/workflows/monthly-refresh.yml` 中的 `cron` 行：

```yaml
- cron: "0 6 1 * *"   # 当前：每月 1 号 06:00 UTC
# - cron: "0 6 * * 1"  # 示例：每周一 06:00 UTC
```

（可用 [crontab.guru](https://crontab.guru) 构造表达式。）

---

## 第 6 部分 — 故障排查

| 现象 | 原因 / 解决 |
|---|---|
| PR 步骤报错：*"GitHub Actions is not permitted to create pull requests"* | 未做第 1a 步 —— 开启写权限 + 勾选 "Allow… create PRs"。 |
| 在 **prep:validate** 失败 | 某实时数据源返回了畸形/超出枚举的数据。这是门控在起作用 —— `main` 受到保护。打开失败步骤的日志查看是哪个文件/记录；修正采集器或稍后重试。 |
| 在 **npm ci** 失败 | 锁文件不同步 —— 通常是临时性的，重试即可。 |
| Actions 下看不到该工作流 | 工作流必须在默认分支（现已是）。刷新页面；确认 Settings → Actions → General 中 Actions 未被禁用。 |
| 定时任务没有触发 | GitHub 在高负载时可能延迟定时任务，且仓库约 60 天无活动后会暂停。手动跑一次以确认并重置。 |
| 某采集器显示 0 行 | 其密钥未配置为 Secret（第 1b 步）—— 属于预期的休眠状态，并非错误。可在 `/sources` 查看"未采集"说明。 |

---

## 附录 A — Secret 名称与取值对照表

- **Secret 名称**是你在 GitHub **Name** 字段中**精确填写**的文本（区分大小写，不要加引号或空格）。
- **Secret 取值**是你在各服务商账户中**自行生成**的私密凭证 —— 本仓库不持有、也不应出现在任何公开位置。
- **重要：FDA 是两个独立的 Secret**（`FDA_OII_USER` 和 `FDA_OII_KEY`），需分别添加两条 —— 不是合并成一个值。
  其余每一行都是单个 Secret。

| GitHub Secret **名称**（精确填写） | **取值**含义 | 在哪里生成取值 |
|---|---|---|
| `SOCRATA_APP_TOKEN` | Socrata 账户的 "App Token" 字符串（可选，仅提升限流上限） | data.cityofnewyork.us → 登录 → **My Profile → Developer Settings → Create New App Token** → 复制 **App Token** |
| `FDA_OII_USER` | FDA OII 的 **Authorization-User**（注册的 user/email 标识） | FDA OII Unified Logon 门户 → 申请 API 凭证 → 会签发一对 *User* + *Key* |
| `FDA_OII_KEY` | FDA OII 的 **Authorization-Key**（API key 字符串） | 同上 FDA OII 门户（凭证对中的 *Key* 那一半） |
| `LEGISCAN_KEY` | 你的 LegiScan API key | legiscan.com → 免费注册 → **Account → API Key** → 复制 |
| `NY_SENATE_KEY` | 你的 NY Senate OpenLegislation API key | legislation.nysenate.gov → **Sign up / Request API Key** → 从确认邮件复制 |
| `OPENSTATES_KEY` | 你的 OpenStates API key（以 `X-API-KEY` 头发送） | openstates.org/accounts → 注册 → **Profile** 页面 → 申请/复制 API key |
| `DOL_ENFORCE_KEY` | DOL enforcedata key —— **暂时跳过**（见下方说明） | 暂不适用 |

### 添加单个 Secret 的范例（每个 Secret 重复一次）

1. 仓库 → **Settings → Secrets and variables → Actions**。
2. 点击 **New repository secret**。
3. **Name：** 精确输入 `LEGISCAN_KEY`。
4. **Secret：** 粘贴从 legiscan.com 复制的 key 取值。
5. 点击 **Add secret**。
6. 对表中每个名称重复。FDA 需做**两次** —— 一次名称为 `FDA_OII_USER`，一次为 `FDA_OII_KEY`。

### 建议

- **以上全部为可选。** 一个 Secret 都不加，Action 仍可运行，只是对应数据源休眠
  （0 行 + `/sources` 上的诚实说明），绝不伪造。
- **性价比最高：** `LEGISCAN_KEY` 与 `OPENSTATES_KEY` —— 均免费、即时注册，二者一起即可激活
  实时州级法案数据源（模块 3）。`SOCRATA_APP_TOKEN` 锦上添花（NYC 拉取更快）但非必需。
- **跳过 `DOL_ENFORCE_KEY`：** 该采集器是有意保留的**休眠桩**，其仓库内说明为
  *"Dormant — set `DOL_ENFORCE_KEY` + wire the WHD bulk parse."*。配置该 key 会启用它，
  但 WHD 解析逻辑尚未完成，因此暂时不会产出数据。等该功能开发完再配置（如需我可以来实现）。
- **`FDA_OII_USER`/`FDA_OII_KEY`** 需要 FDA OII Unified Logon 账户，注册较繁琐 ——
  仅当你确实需要实时进口拒收记录时才值得做（模块 2 现已有 58 行，来自精选 + Federal Register 数据源）。
- 若你完全不想申请任何密钥，可以**一个都不加**，每月的 Action 仍会刷新所有无需密钥的数据源
  （NYC DOH 检查、OATH 多机构执法、Boston、Federal Register、RSS）—— 这本就是实时数据的主体部分。
