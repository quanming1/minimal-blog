# PRD-F2 秒级发布（gh-pages 产物分支）

## 元信息

| 字段 | 值 |
|---|---|
| 阶段 | F2 |
| 名称 | 秒级发布（本地 build 推 gh-pages 分支） |
| 状态 | **已验收**（2026-08-13 全部 AC 通过） |
| 创建日期 | 2026-08-13 |
| 定稿日期 | 2026-08-13 |
| 验收日期 | 2026-08-13（全部 AC 通过） |
| 关联文档 | docs/TODO.yaml F2；docs/security.md；docs/PROCESS.md；PRD-F1-blog-cli.md |

## 1. 背景与目标

- **背景**：F1 的 mb publish 走完整 Actions 链路（push main → test → build → deploy-pages），文章发布需等 1-2 分钟 CI 全绿才上线。文章是低压低风险操作，强一致 CICD 是杀鸡用牛刀。GitHub Pages 的「Deploy from a branch」模式**不会跑 Astro build**，只 serve 分支里的静态文件——所以「秒级」的正确实现是：本地 build 产出 dist，把产物推到独立 gh-pages 分支，Pages 直接 serve（无构建）。
- **目标**：`mb publish` 本地 build 后直接推 gh-pages 产物，线上秒级可见；main 源码仍提交（历史可追溯），CI 保留 lint+test 作为非阻塞验证。
- **非目标**：不取消本地验证（publish 仍先 build 保证正确性）；不删除源码提交；不做多环境/回滚 UI。

## 2. 需求范围

- [ ] FR1：`mb publish` 改为：本地 `bun run build` → 推 dist 到 `gh-pages` 分支（git worktree + force push，含 `.nojekyll`）→ 秒级可见；同时提交 main 源码（文章/CLI 变更）
- [ ] FR2：Pages 部署源由 `workflow` 改为 `legacy`（gh-pages 分支，path `/`）——用 gh api 切换
- [ ] FR3：CI 改角色——deploy.yml 删 build/deploy job，保留 lint+test（main push 触发，非阻塞部署）
- [ ] FR4：全局 shim 动态定位仓库（从 cwd 向上找 minimal-blog package.json），不写死路径
- [ ] FR5：回退预案——文档记录如何切回 Actions 部署（build_type 改回 workflow）

## 3. 技术方案

- **gh-pages 分支内容**：dist 的完整产物（含 base `/minimal-blog/` 路径），根放 `.nojekyll`（禁用 Jekyll 处理）
- **推送方式**：`git worktree add` 临时 worktree 指向 gh-pages → 清空 → 复制 dist → commit（`publish: <ts>`）→ force push origin gh-pages → 删 worktree
- **Pages 源切换**：`gh api -X PUT repos/quanming1/minimal-blog/pages -f build_type=legacy -f 'source[branch]=gh-pages' -f 'source[path]=/'`
- **CI 验证**：main push 触发 lint+test（test 无需 build），不再上传 artifact
- **shim 定位**：`mb.cmd` 调 `mb-bootstrap.mjs`，后者从 cwd 向上找 `package.json` 且 name=minimal-blog，找不到则报错

## 4. 接口定义

`mb publish` 行为变化：
- 原：验证→commit main→push main→等 CI→线上抽查
- 新：本地 build → commit main 源码 → push main（源码）→ 推 gh-pages（产物）→ 线上秒级抽查

## 5. 验收标准

- [ ] AC1：`mb publish` 发一篇文章后，线上 URL 秒级（<10s，不含 Pages 传播）返回新内容
- [ ] AC2：gh-pages 分支包含 dist 产物 + `.nojekyll`；Pages 源为 legacy/gh-pages
- [ ] AC3：main push 仍触发 CI lint+test 且全绿（不再部署）
- [ ] AC4：`mb --help` 在非仓库目录报「未找到仓库」而非崩溃；仓库内任意子目录可用
- [ ] AC5：回退文档可执行（切回 workflow 的命令已记录）

## 6. 测试计划

- 发测试文章 → mb publish → 秒级验证线上内容
- 切源后 Pages 正常 serve（首页/文章/资产 200）
- 回退演练：切回 workflow 确认可恢复

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| Pages legacy 部署有 CDN 缓存延迟 | `.nojekyll` + 强制刷新验证；记录预期传播时间 |
| 本地 build 与 CI 环境差异 | publish 仍本地 build（与 CI 同命令），且 CI lint+test 兜底 |
| force push gh-pages 与并发 publish | publish 全程持锁（F1 已有），单机串行 |
| 切源失败导致线上挂 | 回退文档 + 保留 workflow 文件（仅注释 deploy job，可快速恢复） |

## 8. 变更记录

| 日期 | 变更内容 | 理由 |
|---|---|---|
| 2026-08-13 | 初始定稿 | — |
| 2026-08-13 | 验收记录：AC1-5 全过——mb publish 走新快速通道（build→commit main→push main→推 gh-pages→秒级可见），gh-pages 分支产物含 .nojekyll，Pages 源已切 legacy/gh-pages（gh api JSON body），CI 改纯 lint+test，shim 动态定位（bootstrap 直接 import 入口，无 shell 转义）。实测：改 description → publish → 线上 <20s 命中新值（?v 绕缓存）。回退命令：gh api -X PUT .../pages --input body（build_type=workflow） | 实测证据 |
