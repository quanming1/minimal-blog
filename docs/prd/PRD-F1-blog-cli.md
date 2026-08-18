# PRD-F1 博客 CLI（全局 mb 命令）

## 元信息

| 字段 | 值 |
|---|---|
| 阶段 | F1 |
| 名称 | 博客 CLI（全局 mb 命令：CRUD + 行号级编辑 + 并发安全 publish） |
| 状态 | **已验收**（2026-08-13 全部 AC 通过） |
| 创建日期 | 2026-08-13 |
| 定稿日期 | 2026-08-13 |
| 验收日期 | 2026-08-13（全部 AC 通过） |
| 关联文档 | docs/TODO.yaml F1；docs/PROCESS.md；AGENTS.md；.ftre/skills/publish-post/SKILL.md |

## 1. 背景与目标

- **背景**：博客进入多 agent 协作时代——其他 AI agent 需要一个**可脚本化、并发安全**的文章操作入口。现状痛点：手动编辑易踩 frontmatter 坑（date 引号/BOM）、全文替换不精准、多 agent 同时编辑/发布会产生覆盖与 push 冲突；英文双版本维护成本高且非必需。
- **目标**：全局 `mb` 命令，覆盖文章 CRUD + 行号级编辑（hash 乐观并发）+ publish 全流程（锁互斥 + rebase 重试），配套根目录 Skill 教其他 agent 使用；下线 /en/ 英文站点（只发中文）。
- **非目标**：不做草稿/定时发布（F2）；不做 npm 发包（bun link 全局即可）；不改变站点视觉与既有功能。

## 2. 需求范围

### 2.1 功能需求

- [ ] FR1：`mb new <slug> --title --tags --column` 创建文章（模板 + date 自动引号 + slug 校验 + UTF-8 无 BOM）
- [ ] FR2：`mb list` 文章列表（slug/date/title/tags/column，机器可读）
- [ ] FR3：`mb lines <slug>` 带行号输出正文 + 内容 hash（编辑前置步骤）
- [ ] FR4：`mb edit <slug> replace|insert|delete|append` 行号级编辑（1-based，区间 `N` 或 `N:M`；replace/insert/delete 必须 `--hash` 乐观并发校验）
- [ ] FR5：`mb meta <slug> get|set` frontmatter 字段级读写
- [ ] FR6：`mb rm <slug>` 删除文章（提示关联资产目录）
- [ ] FR7：`mb publish` 全流程：验证（lint+test+build）→ commit（过 hook）→ push → CI 等待 → 线上 200 抽查；`--skip-verify` 跳过本地验证（显式选择）
- [ ] FR8：并发安全三层——写操作文件锁（PID+时间戳+超时回收）+ 原子写（tmp+rename）+ edit hash 冲突拒绝；publish 全程持锁 + push 前 `pull --rebase` + 非 ff 重试一次
- [ ] FR9：全局命令：package.json bin + `bun link`；任意目录可用（自动定位仓库根）
- [ ] FR10：Skill 文件 `.ftre/skills/blog-cli/SKILL.md`：命令面/工作流/并发规则/发布语义，供其他 agent 读取
- [ ] FR11：下线 /en/：删 en 文章与路由（index/about/posts/tags/columns）、移除语言切换与 hreflang en、搜索与相关文章只 zh；en URL 返回 404

### 2.2 非功能需求

- 零新依赖（Bun 内置 API：fs/crypto/child_process）
- CLI 输出对 agent 友好：明确退出码（0 成功/1 用户错误/2 冲突/3 系统错误）、错误信息含下一步建议
- 不破坏现有验证链与 hook 规范

## 3. 技术方案

- **入口**：`scripts/mb.ts`（单文件或 scripts/mb/ 目录拆分），`bun run mb` 本地 / `bin/mb` 全局 shim
- **仓库定位**：从 cwd 向上找 package.json（name=minimal-blog）定位根；找不到报错
- **hash**：Bun.CryptoHasher('sha256') 对「当前文件全文」取前 12 hex；edit 前校验一致，不一致退出码 2 并提示重新 lines
- **锁**：`.mb-lock`（仓库根，gitignore）；内容 `{"pid":..,"ts":..}`；获取时若存在且 pid 活着且未超时（默认 300s）→ 退出码 3 等待提示；进程退出（正常/信号）释放
- **原子写**：写 `<file>.tmp-<pid>` → `fs.renameSync`
- **publish**：spawn 顺序执行，任一步失败即停并释放锁；push 失败（非 ff）→ `git pull --rebase` → 重试 push 一次；CI 等待用 `gh run watch`；线上 200 用 HEAD 请求抽查首页+最新文章
- **en 下线**：删除目录 + Base.astro 语言切换/hreflang/翻译检测移除（hasTranslation 恒 false 逻辑清理）、i18n en 文案保留（无害）但路由/测试清理

## 4. 接口定义（命令面）

```text
mb new <slug> [--title t] [--tags a,b] [--column c]   创建（date 今日）
mb list                                               列表（JSON 行）
mb lines <slug> [--start N] [--end M]                 行号 + 内容（首行 hash:）
mb edit <slug> replace <N[:M]> --text s --hash h      替换行区间
mb edit <slug> insert <N> --text s --hash h           第 N 行前插入
mb edit <slug> delete <N[:M]> --hash h                删除行区间
mb edit <slug> append --text s                        文末追加（无需 hash）
mb meta <slug> get <field> | set <field> <value>       frontmatter 字段
mb rm <slug> [--yes]                                  删除
mb publish [--skip-verify] [--no-wait-ci] [--msg m]   发布全流程
```

## 5. 验收标准

- [ ] AC1：`mb new demo-post --title 测试` 生成合规 frontmatter（date 带引号/无 BOM），`bun run build` 成功
- [ ] AC2：`mb lines` → `mb edit replace/insert/delete` 行号操作精确（前后 diff 符合预期），append 正常
- [ ] AC3：模拟并发冲突：取 hash → 手动改文件 → edit 带旧 hash → 退出码 2 拒绝且文件未被覆盖
- [ ] AC4：模拟锁竞争：持锁进程存活时另一写操作退出码 3；锁超时（改小 TTL）后可自动回收
- [ ] AC5：`mb publish` 全流程成功（lint/test/build/commit/push/CI 绿/线上 200）；`--skip-verify` 生效
- [ ] AC6：`bun link` 后任意目录 `mb --help` 可用；仓库外执行报可理解的错
- [ ] AC7：dist 无 en/ 页面；线上 en URL 404；首页/文章页 200；语言切换按钮消失；lint 0 errors；test 全绿；build 成功
- [ ] AC8：Skill 文件覆盖全部命令 + 并发规则 + 发布语义，其他 agent 可照做

## 6. 测试计划

- 单测：scripts/mb/ 纯函数（行区间解析、hash、frontmatter 解析/序列化、锁超时判断）
- 集成：真实仓库临时文章的 CRUD/编辑/publish（dry 场景拆步验证）
- 并发：hash 冲突、锁竞争、锁超时三个场景脚本化验证（AC3/AC4）

## 7. 里程碑与估算

| 子任务 | 预估 |
|---|---|
| en 下线 + 回归 | 1h |
| CLI 核心（编辑/hash/锁/publish） | 3h |
| 全局注册 + Skill | 0.5h |
| 并发验证 + 收尾 | 1h |

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 锁文件残留导致死锁 | TTL 超时回收 + pid 存活检测双保险 |
| 行号编辑越界/破坏 frontmatter | 区间校验（frontmatter 分界行内禁止 delete/replace 边界破坏）+ 失败不落盘 |
| publish 中途失败留下半状态 | 每步幂等（build 可重跑、commit 可 amend、push 前 rebase）；锁保证串行 |
| en 下线破坏翻译对逻辑 | hasTranslation 逻辑统一恒 false 处理，搜索索引/相关文章只取 zh |

## 9. 变更记录

| 日期 | 变更内容 | 理由 |
|---|---|---|
| 2026-08-13 | 初始定稿 | — |
| 2026-08-13 | 验收记录：AC1-8 全过——new/lines/edit（replace/insert/delete/append）/meta/rm/publish 实测；hash 冲突 exit 2 拒绝覆盖；活锁 exit 3（含 pidAlive EPERM 修复：Windows 跨进程 kill(0) 得 EPERM 应视为存活）；bun link 的 mb.exe 与 npm shim 装的 bun 不兼容，全局注册改为 %APPDATA%\npm\mb.cmd 包装（PATH 已含）；build 14 页无 en；193 tests 全绿 | 实测证据 |
