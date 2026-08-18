# PRD-F3 整篇导入发布（mb publish-file）

## 元信息

| 字段 | 值 |
|---|---|
| 阶段 | F3 |
| 名称 | 整篇导入发布（本地 md/txt 文件 → 文章 → 秒级发布） |
| 状态 | **已验收**（2026-08-18 全部 AC 通过） |
| 创建日期 | 2026-08-18 |
| 定稿日期 | 2026-08-18 |
| 关联文档 | docs/TODO.yaml F3；docs/PROCESS.md；PRD-F1-blog-cli.md；PRD-F2-fast-publish.md |

## 1. 背景与目标

- **背景**：F1 的 mb 写文章是行号级编辑（`lines` → `edit replace/insert/append`），适合小改动，但长文章（几百行）一行行喂很痛苦；且 agent 在 Windows cmd 下传多行 `--text` 会被换行符截断（实测踩坑）。用户需要一条通道：直接拿现成的 `.md` / `.txt` 文件整篇变成博客文章并发布。
- **目标**：新增 `mb publish-file <path>`，读本地文件（自动检测 UTF-8 / GBK 编码）→ 解析 frontmatter（文件自带优先，命令行补缺）→ 写入文章 → 走秒级发布。
- **非目标**：不改行号编辑（仍适合小改动）；不做批量导入/目录递归；不做文件监听自动发布。

## 2. 需求范围

- [ ] FR1：`mb publish-file <path>` 读本地 `.md`/`.txt` 文件，自动检测编码（UTF-8 BOM / UTF-8 / GBK）
- [ ] FR2：文件带 YAML frontmatter（`---` 头）时，title/date/description/column/tags 以文件为准；命令行参数（`--title`/`--date`/`--tags`/`--column`）只补缺
- [ ] FR3：文件无 frontmatter 时，`--title` 必填（否则报错退出码 1），date 默认今日，正文为整个文件
- [ ] FR4：slug 由 `--slug` 指定；缺省取文件名去扩展名转 kebab-case；转换结果非法（中文名等）报错要求 `--slug`；slug 已存在时报错（复用 cmdNew 行为）
- [ ] FR5：写入复用现有锁 + 原子写 + UTF-8 无 BOM；默认导入后立即 publish（`--no-publish` 只导入不发布）
- [ ] FR6：frontmatter 归一化——date 无论来源一律补引号（防 YAML 裸日期陷阱），title 含 `: ` 补引号，tags 从命令行 `a,b` 转为 `[a, b]`
- [ ] FR7：修复 publish 对新文章 commit msg 生成错误（untracked 文件不被 `git diff --name-only HEAD` 捕获 → msg 误为 `chore(release)`）

## 3. 技术方案

- **编码检测**：读 Buffer → 查 BOM（`EF BB BF` / `FF FE` / `FE FF`）→ 否则 `TextDecoder('utf-8', { fatal: true })` 解码，失败则 `TextDecoder('gbk')`（Bun 原生支持，实测确认）
- **slug 转换**：basename 去扩展名 → 小写 → 空格/下划线/点/非 `[a-z0-9-]` 字符 → 短横线 → 合并连续短横线 → 去首尾短横线；结果不匹配 `validSlug` 则报错
- **frontmatter 合并**：复用 `parsePost` 解析；新增 `buildFrontmatter(fm, opts)` 纯函数（文件优先 + 命令行补缺 + title 必填校验 + 归一化）
- **写入**：复用 `serializePost` + `acquireLock` + `atomicWrite`
- **msg 修复**：publish 里先 `git add -A` 再 `git diff --cached --name-only HEAD` 取 staged 文件名

## 4. 接口定义

```
mb publish-file <path> [--slug s] [--title t] [--tags a,b] [--column c] [--date d] [--no-publish] [--msg m] [--skip-verify]
```

## 5. 验收标准

- [ ] AC1：带 frontmatter 的 `.md`（UTF-8）导入后 title/date/tags/column 与文件一致，正文完整
- [ ] AC2：无 frontmatter 的 `.txt`（GBK 编码）用 `--title` 导入后中文不乱码，date 为今日
- [ ] AC3：缺 title（文件无 frontmatter 且无 `--title`）时报错退出码 1
- [ ] AC4：中文文件名无 `--slug` 时报错提示；英文文件名自动转合法 slug
- [ ] AC5：新文章发布 commit msg 为 `post(posts):`（修复后），线上秒级可见
- [ ] AC6：单测全绿，lint/test/build 全过

## 6. 测试计划

- 单测：`slugFromFilename`（英文/中文/空格/下划线/空结果）、`readFileAutoEncoding`（UTF-8/GBK/BOM）、`buildFrontmatter`（文件优先/补缺/缺 title 报错/归一化）
- 实测：临时目录造 `.md`（UTF-8 带 frontmatter）与 `.txt`（GBK 无 frontmatter）各 `publish-file` 一次，线上 200，再清理

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| GBK 检测误判 | UTF-8 fatal 优先（合法 UTF-8 不会误判为 GBK），GBK 仅作 fallback |
| 中文文件名无 slug | 报错提示 `--slug`，不静默生成乱码 slug |
| 覆盖线上同名文章 | slug 已存在时报错，不引入 `--force`（保持简单，符合 F1 行为） |

## 8. 变更记录

| 日期 | 变更内容 | 理由 |
|---|---|---|
| 2026-08-18 | 初始定稿 | — |
| 2026-08-18 | 验收记录：单测 203 pass（新增 slugFromFilename/readFileAutoEncoding/buildFrontmatter 共 10 例）、lint 0 errors、build 23 页；实测 publish-file 发布 f3-import-md（UTF-8 带 frontmatter）与 f3-import-txt（GBK 无 frontmatter）均成功，commit msg 正确为 post(posts)（验证 publish msg 修复），线上秒级可见；测试文章已清理 | 实测证据 |
