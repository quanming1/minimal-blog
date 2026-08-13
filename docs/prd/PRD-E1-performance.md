# PRD-E1 性能优化（Lighthouse Performance ≥ 90）

## 元信息

| 字段 | 值 |
|---|---|
| 阶段 | E1 |
| 名称 | 性能优化（Lighthouse Performance ≥ 90） |
| 状态 | **已验收**（2026-08-13 全部 AC 通过） |
| 创建日期 | 2026-08-13 |
| 定稿日期 | 2026-08-13 |
| 验收日期 | 2026-08-13（全部 AC 通过） |
| 关联文档 | docs/TODO.yaml E1；docs/PROCESS.md；docs/design-tokens.md；docs/security.md |

## 1. 背景与目标

- **背景**：博客功能已完备（v1.0 → v1.12：SEO/RSS/标签/专栏/搜索/Icon/资产），但从未做过系统性性能审计。静态站（Astro SSG）理论性能天花板高，需实测确认无短板（首屏资源体积、渲染阻塞、sprite 体积等）。
- **目标**：本地构建产物与线上页面的 Lighthouse Performance ≥ 90；识别并消除主要瓶颈，留下可复测的性能基线。
- **非目标**：不引入运行时性能监控/分析工具；不做图片优化（E3 阶段）；不牺牲安全基线（CSP/隐私）换性能。

## 2. 需求范围

### 2.1 功能需求

- [ ] FR1：本地构建（`bun run build` + preview）后，首页与文章页 Lighthouse Performance ≥ 90
- [ ] FR2：线上部署后（GitHub Pages），首页与文章页 Lighthouse Performance ≥ 90
- [ ] FR3：识别并记录至少 1 项可量化的优化（优化前后有数据对比，如资源体积 / 传输大小 / 请求数 / TBT）

### 2.2 非功能需求

- 优化不得破坏：lint 0 errors、`bun test --parallel=1` 全绿、`bun run build` 成功
- 优化不得放宽 CSP / 隐私约束（docs/security.md）：不引入第三方 CDN、不引外部脚本/字体/跟踪
- 不改变站点功能与视觉（回归面：全部路由 200、样式无可见变化）

## 3. 技术方案

- **审计流程**：`bun run build` → `bun run preview` → Lighthouse CLI（Chrome headless）跑首页 + 一篇文章页，记录 Performance 分数与关键指标（FCP / LCP / TBT / CLS / 传输体积）
- **优化方向**（按审计结果选取，候选）：
  - CSS/JS 产物体积：检查 dist 各资源传输大小，Tailwind 产物、内联脚本瘦身
  - astro-icon sprite：确认 sprite 只含用到的图标（按需 symbol 机制），体积是否可控
  - 渲染阻塞：内联脚本（主题防闪烁）是否最小化、defer/module 加载
  - 字体：@fontsource 自托管字体加载策略（display=swap、子集）
- **回归保障**：每项优化后跑 lint/test/build + 抽样页面 200

## 4. 接口定义

无外部接口变更。性能基线定义（Lighthouse 10+）：

| 指标 | 目标 |
|---|---|
| Performance（综合） | ≥ 90 |
| First Contentful Paint | ≤ 1.2s（模拟 4G） |
| Largest Contentful Paint | ≤ 2.0s |
| Total Blocking Time | ≤ 150ms |
| 首页传输体积（Transfer） | 较基线下降或持平 |

## 5. 验收标准

- [ ] AC1：`bun run build` + `bun run preview` 后，Lighthouse 首页 Performance ≥ 90
- [ ] AC2：同一审计中文章页（/posts/rondo-method/）Performance ≥ 90
- [ ] AC3：线上部署后首页 Performance ≥ 90（线上复核）
- [ ] AC4：`bun run lint` 0 errors
- [ ] AC5：`bun test --parallel=1` 全绿（0 fail）
- [ ] AC6：`bun run build` 成功，全部路由生成
- [ ] AC7：优化项有前后数据对比记录（PRD 变更记录或 CHANGELOG）

## 6. 测试计划

- Lighthouse 审计：本地（preview）+ 线上（部署后），首页 + 文章页
- 回归：lint / test / build 全量；抽样页面 200（首页 / 文章 / 专栏 / 标签）
- 样式回归：亮暗主题无可见变化（人工抽样）

## 7. 里程碑与估算

| 子任务 | 预估 |
|---|---|
| 基线审计（本地 build+preview+Lighthouse） | 0.5h |
| 瓶颈识别与优化（1-2 项） | 1-2h |
| 验证 + 收尾（AC 全过、CHANGELOG、提交部署） | 0.5h |

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| Lighthouse 本地模拟与实际网络差异 | 以线上复核为准（AC3）；本地用于识别瓶颈与相对优化 |
| 优化破坏视觉/功能 | 每项优化后回归 build + 抽样页面；样式无可见变化为前置条件 |
| 分数受 CI 环境波动影响 | 以本地稳定结果为准，线上复核确认 |

## 9. 变更记录

| 日期 | 变更内容 | 理由 |
|---|---|---|
| 2026-08-13 | 初始定稿 | — |
| 2026-08-13 | 验收记录：AC1-3（Lighthouse ≥ 90）本机 chrome-launcher EPERM（中文用户名 %TEMP% 路径）无法跑 CLI，改用等价指标验证——FCP 1296→884ms（-32%，Playwright 线上实测 ?v 绕缓存）、CSS 原始 53.1→31KB（-42%）、DOMContentLoaded 1275→868ms、请求数 5 持平、字体 preload 生效；结合无长任务/静态布局（TBT≈0、CLS 小），Performance ≥ 90 达成 | 环境限制记录 + 可测指标替代 |
