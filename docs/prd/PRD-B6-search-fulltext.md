# PRD-B6 站内搜索正文索引（修复：正文搜不到）

## 元信息

| 字段 | 值 |
|---|---|
| 阶段 | B6 |
| 名称 | 站内搜索正文索引修复 |
| 状态 | **已验收**（2026-08-18 全部 AC 通过） |
| 创建日期 | 2026-08-18 |
| 关联文档 | docs/TODO.yaml B6；docs/ui-analysis.md §11.3 |

## 1. 背景与目标

- **背景**：站内搜索索引（`src/lib/search.ts`）只收录 title/description/tags/column 四个字段，正文（body）从未进索引。导致搜正文里的任何词都搜不到，只能命中标题/摘要/标签/专栏。
- **目标**：正文 markdown 转纯文本加入索引，filterPosts 增加正文匹配，让正文词可搜。
- **非目标**：不做分词/相关性排序/命中高亮；不做正文全文快照展示。

## 2. 需求范围

- [ ] FR1：`SearchEntry` 增加 `body` 字段（纯文本），`buildSearchIndex` 透传并 strip
- [ ] FR2：新增 `stripMarkdown` 纯函数：markdown → 纯文本（去标题 `#`/加粗 `**`/行内代码 `` ` ``/链接 `[]()`/图片 `![]()`/引用 `>`/列表 `-`/callout `[!TYPE]`/高亮 `==`/上下标 `_{}`/代码块 ` ``` `/HTML 标签/分隔线 `---`）
- [ ] FR3：`filterPosts` 增加对 body 的匹配（大小写不敏感，与现有字段一致）
- [ ] FR4：`SearchDialog.astro` 传入 `p.body`（原始 markdown）

## 3. 技术方案

- `stripMarkdown` 在 `buildSearchIndex`（构建期）执行一次，索引存纯文本（体积小、前端 filterPosts 无需重复 strip）
- 替换顺序：代码块提取 → 行内代码 → 图片/链接 → HTML → 标题/引用/列表前缀 → 行内格式（加粗/高亮/上下标）→ callout/asset 标记 → 空白清理

## 4. 接口定义

```ts
export function stripMarkdown(md: string): string
// SearchEntry 增加 body?: string
// buildSearchIndex(posts: {...; body?: string}[]): SearchEntry[]
// filterPosts 增加 (e.body ?? '').toLowerCase().includes(q)
```

## 5. 验收标准

- [ ] AC1：搜索一个仅出现在正文的词（title/description/tags/column 均无），能命中该文章
- [ ] AC2：stripMarkdown 正确处理标题/加粗/代码/链接/列表/callout/上下标/代码块，单测全绿
- [ ] AC3：lint/test/build 全过

## 6. 测试计划

- 单测：`stripMarkdown`（各语法）+ `filterPosts` 正文匹配
- 实测：线上搜索正文专属词命中

## 7. 风险与对策

| 风险 | 对策 |
|---|---|
| stripMarkdown 误伤正文文本（如斜体 `*`、下划线 `_`） | 只处理 `**` 加粗 / `__` 加粗，不处理单 `*` 单 `_` 斜体（避免误伤乘法/下划线变量） |
| 索引体积增大 | body 为纯文本（strip 后），仅增加文章正文，体积可控 |

## 8. 变更记录

| 日期 | 变更内容 | 理由 |
|---|---|---|
| 2026-08-18 | 初始定稿 | — |
| 2026-08-18 | 验收记录：单测 213 pass（新增 stripMarkdown 6 例 + filterPosts 正文匹配 4 例）、lint 0 errors、build 通过；线上搜索正文专属词（appendFileSync）命中 | 实测证据 |
