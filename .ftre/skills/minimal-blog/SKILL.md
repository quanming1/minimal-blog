---
name: minimal-blog
description: 用 mb CLI 操作与发布 minimal-blog 博客（https://quanming1.github.io/minimal-blog/，Astro + GitHub Pages，中英双语）。当 agent 需要新建/查看/修改/删除博客文章、把本地 md/txt 成稿一键发布上线、按行号小改、批量迁移外站文章（含图片本地化）、或排查发布失败时使用，即使用户没说"mb"或"发布"这个词。已合并旧 blog-cli 与 publish-post 两个 skill 的全部场景。不用于博客本身的样式/组件/构建配置改动（那是普通开发任务，按仓库 AGENTS.md 处理），也不用于其他项目的写作。
---

# mb — minimal-blog 文章操作与发布（合并版）

<overview>
- 博客 = Astro 静态站。文章即 Markdown：`src/content/posts/zh/<slug>.md`（URL `/posts/<slug>/`）、`en/<slug>.md`（`/en/posts/<slug>/`）；同 slug 中英两篇是翻译对
- 发布模型：main 分支存源码，gh-pages 分支存 dist 产物；push gh-pages 后 GitHub Pages 秒级 serve（无 CI 构建）。发布是仓库级操作
- 全局命令 `mb`（未注册时仓库内 `bun run mb` 等价）；源码 `scripts/mb/`，设计 PRD 在 `docs/prd/`
- mb 内置 hash 乐观并发 + 文件锁——多 agent 并发安全的前提是**一切写操作走 CLI**
</overview>

<commands>
```bash
mb new <slug> [--title t] [--tags a,b] [--column c]     # 创建（date 今日自动带引号）
mb list                                                 # 列表：slug/date/title/tags/column
mb lines <slug> [--start N] [--end M]                   # 带行号输出；首行 hash（行编辑前置）
mb edit <slug> replace <N[:M]> --text s --hash h        # 替换行区间（1-based 闭区间）
mb edit <slug> insert <N> --text s --hash h             # 第 N 行前插入
mb edit <slug> delete <N[:M]> --hash h                  # 删除行区间
mb edit <slug> append --text s                          # 文末追加（无需 hash）
mb meta <slug> get <field>                              # 读 frontmatter 字段
mb meta <slug> set <field> <value>                      # 写字段（date/title 自动补引号）
mb rm <slug> --yes                                      # 删除（public/assets/<slug>/ 不自动删）
mb publish [--skip-verify] [--msg m]                    # 发布全流程（验证→commit main→推 gh-pages→秒级上线）
mb publish-file <路径> [--slug s] [--title t] [--tags a,b] [--column c] [--date d] [--no-publish] [--msg m] [--skip-verify]
                                                        # 整篇导入本地 .md/.txt 并发布——新文章首选
```

退出码：0 成功 | 1 用户错误 | 2 hash 冲突 | 3 锁被占/系统错误
</commands>

<workflows>

### 工作流 A：发布成稿（新文章/大改的 DEFAULT 路径）

```xml
<good-example>
写好完整 md（含 frontmatter）→ mb publish-file C:\path\文章.md --slug my-post
文件自带 frontmatter 时以文件为准，命令行参数只补缺；slug 默认取文件名 kebab-case。
</good-example>
<bad-example>
mb new 后用 shell 变量传多行正文给 mb edit——cmd/PowerShell 会丢换行或转码乱码（实测：中文变 钂嬪叏鏄嶾、68 行被压成 1 行）。
</bad-example>

### 工作流 B：小改动（行级编辑）

1. `mb lines <slug>` 拿行号 + 当前 hash
2. `mb edit <slug> replace N:M --text "..." --hash <hash>`（成功后 CLI 输出新 hash；隔一阵重新 lines）
3. 需要时 `mb meta <slug> set description "..."`
4. `mb publish`

### 工作流 C：批量迁移外站文章（专栏）

1. 抓取正文转 md；frontmatter 写 `column: <专栏名>` + `columnOrder: N`（整数，小在前）+ 转载来源标注（含原文链接，尊重版权）
2. 逐篇 `mb publish-file <file> --no-publish`（只导入不发布——避免 N 次验证）
3. 最后一次性 `mb publish --msg "post(posts): ..."`
4. **外链图片会被站点 CSP 拦截（img-src 'self'）**：下载到 `public/assets/<目录>/`，文章内链接改写为 `/minimal-blog/assets/<目录>/<文件名>`；改写走 mb（逐篇 lines→replace 正文区间），发布前断言"残留外链图 = 0"
</workflows>

<hard_rules>
- NEVER 绕过 CLI 直写 `src/content/posts/`——直写没有 hash 校验与锁，破坏并发安全
- NEVER 在 shell 里给 `mb edit` 传多行 `--text`（cmd/PowerShell 丢换行/转码乱码）。多行内容 ALWAYS 先落文件，走 `mb publish-file`；确需 mb edit 传多行时用 Node/Bun spawn 参数数组调用
- NEVER 让 `--text` 的值以 `--` 开头（如含 frontmatter 的 `---`）——CLI 参数解析器会误判"缺 --text"（实测坑）。ALWAYS 只替换正文区间，或在正文前垫一个空行
- NEVER 收到 exit 2（hash 冲突）后盲重试同一 hash——重新 `mb lines` 取新 hash
- NEVER 默认 `--skip-verify`（须用户显式要求）
- Windows 下批量循环调 mb 前 ALWAYS `chcp 65001`（中文用户名路径 GBK 乱码会让所有路径操作失效）
- 多篇文章要改：逐篇 edit（每篇独立 lines→edit），最后一次性 `mb publish`
</hard_rules>

<pitfalls>
| 症状 | 根因 | 处理 |
|---|---|---|
| `--text 必填`（明明传了） | 值以 `--`/`---` 开头被 argVal 误判 | 值前垫空行；或只替换正文区间；或改 publish-file |
| 正文压成一行/中文乱码 | shell 传参丢换行/GBK 转码 | 内容落文件走 publish-file；或 Node spawn 参数数组 |
| publish 报 `gh-pages git add 失败: Unable to write new index file` | Windows 文件句柄瞬时竞态（commit 已有重试，add 没有） | 直接重跑 `mb publish` |
| main 干净但 gh-pages 没推上去（`mb publish` 报"工作区干净，无需发布"） | 幂等检查只看 main，gh-pages 半途失败后永远补不上 | 手动完成第 4 步：清 `.ghpages-worktree`（保留 .git）→ 拷 dist → `git add -A && git commit --allow-empty && git push --force origin gh-pages`（在 worktree 内） |
| 线上图片 404/CSP 拦截 | 外链图违反 `img-src 'self'` | 见工作流 C 第 4 步 |
| slug 已存在报错 | publish-file 防误覆盖 | 确认意图后 `mb rm` 或换 `--slug` |
</pitfalls>

<anti_lazy>
- NEVER 跳过验证链直接提交；NEVER 在发布失败后弃疗——各步幂等，修复后重跑 `mb publish` 即可
- NEVER 对用户声称"已上线"而不给可验证证据（curl 状态码或 gh-pages commit sha）——除非用户明确说不用等线上验证
- 自纠机制：发现跳步/出错 → 立即回到正确步骤重做（如 hash 冲突后重新 lines），而不是继续带病操作
- 翻译对缺英文版是体验降级不是错误——发布后主动告知用户"可选补 en 版"，不擅自翻译
</anti_lazy>

<frontmatter>
| 字段 | 必填 | 说明 |
|---|---|---|
| title | ✓ | 标题（含冒号时 CLI 自动引号） |
| date | ✓ | `'YYYY-MM-DD'`（必须带引号——裸日期 YAML 解析成日期对象，构建失败；CLI 的 new/set/publish-file 自动补） |
| description | ✗ | 摘要（列表页展示） |
| column / columnOrder | ✗ | 专栏名 / 专栏内排序（整数，小在前） |
| tags | ✗ | `[a, b]` |
| author | ✗ | 缺省 zh=蒋全明 / en=Quanming Jiang |

文件 UTF-8 无 BOM（CLI 自动防呆）。slug 小写短横线 kebab-case，NEVER 大写/斜杠；中文主题取英译转 kebab-case。
</frontmatter>

<publish_semantics>
`mb publish` 自动完成：
1. 验证 `bun run lint/test/build`（`--skip-verify` 显式跳过）
2. `git add -A` + commit（消息自动 `post(posts): 文章更新（slug）`，或 `--msg` 指定——必须过 commit-msg hook：type/scope 白名单 + subject 含中文）
3. push main（竞态自动 pull --rebase 重试一次）
4. 清 `.ghpages-worktree` → 拷 dist → gh-pages commit + `push --force`（Pages 秒级生效）

锁全程串行（exit 3 = 锁被占：等 10s 重试；多次失败检查 `.mb-lock` 内持锁 PID）。
</publish_semantics>
