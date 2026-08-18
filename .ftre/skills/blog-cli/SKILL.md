---
name: blog-cli
description: 用 mb 命令操作 minimal-blog 博客（文章 CRUD/行号级编辑/整篇导入/并发安全发布）。当 agent 需要新建、查看、按行号修改、删除博客文章、把本地 md/txt 文件整篇发布（publish-file，长文章首选），或把改动发布到线上时使用，即使没说"mb"这个词。多 agent 并发写同一仓库时本 CLI 内置 hash 乐观并发与文件锁，禁止绕过 CLI 直接改文件。不用于样式/组件/构建配置改动（那是普通开发任务，按 AGENTS.md 处理）。
---

# mb — minimal-blog 文章 CLI（F1）

全局命令 `mb`（本机已注册；未注册时在仓库内用 `bun run mb <子命令>` 等价）。
源码 `scripts/mb/`，设计 `docs/prd/PRD-F1-blog-cli.md`，单测 `scripts/mb/mb.test.ts`。

## 退出码（脚本化判断依据）

| 码 | 含义 | 下一步 |
|---|---|---|
| 0 | 成功 | — |
| 1 | 用户错误（参数/不存在/验证失败） | 看错误信息修正 |
| 2 | **hash 冲突**（文件被他人改过） | 重新 `mb lines` 取新 hash 再编辑 |
| 3 | 锁被占 / 系统错误 | 稍等重试；确认持锁进程死亡后可删 `.mb-lock` |

## 命令面

```bash
mb new <slug> [--title t] [--tags a,b] [--column c]   # 创建（date 今日自动带引号）
mb list                                               # 列表：slug/date/title/tags/column（TAB 分隔）
mb lines <slug> [--start N] [--end M]                 # 带行号输出；首行 hash: <h>（编辑前置）
mb edit <slug> replace <N[:M]> --text s --hash h      # 替换行区间（1-based 闭区间）
mb edit <slug> insert <N> --text s --hash h           # 第 N 行前插入
mb edit <slug> delete <N[:M]> --hash h                # 删除行区间
mb edit <slug> append --text s                        # 文末追加（无需 hash）
mb meta <slug> get <field>                            # 读 frontmatter 字段
mb meta <slug> set <field> <value>                    # 写字段（date/title 自动补引号）
mb rm <slug> --yes                                    # 删除（资产目录 public/assets/<slug>/ 不自动删）
mb publish [--skip-verify] [--msg m]                  # 发布（验证→commit main→推 gh-pages→秒级上线）
mb publish-file <路径> [--slug s] [--title t] [--tags a,b] [--column c] [--date d] [--no-publish] [--msg m] [--skip-verify]
                                                       # 整篇导入本地 .md/.txt 并发布（长文章首选）
```

## 标准工作流（agent 改文章）

```
1. mb lines <slug>            # 拿行号 + 当前 hash
2. mb edit <slug> replace 12:15 --text "新内容" --hash <上一步的 hash>
   # 成功后 CLI 输出新 hash——继续编辑用新 hash；隔了一阵就重新 lines
3. mb meta <slug> set description "新摘要"   # 需要时
4. mb publish                  # 验证→commit main→推 gh-pages→秒级上线（自动）
```

## 并发规则（MUST 遵守）

- **NEVER 绕过 CLI 直接写 `src/content/posts/`**——直写没有 hash 校验和锁，会破坏并发安全
- 行编辑必须带 hash（append 除外）；收到退出码 2 → 重新 `mb lines`，**NEVER 盲重试同一 hash**
- 收到退出码 3（锁被占）→ 等 10s 重试；多次失败提示用户检查 `.mb-lock`（持锁进程 PID 在文件里）
- publish 全程持锁串行：push 前 `pull --rebase` 同步远端，非 fast-forward 自动重试一次——你不需要手动 pull
- 多篇文章要改：逐篇 edit（每篇独立 lines→edit），最后一次性 `mb publish`（发布是仓库级操作）

## 发布语义

`mb publish` 自动完成：
1. 本地验证 `bun run lint/test/build`（`--skip-verify` 显式跳过，NEVER 默认跳）
2. `git add -A` + commit（消息自动按改动生成 `post(posts): 文章更新（slug）`，或 `--msg` 指定——必须过 commit-msg hook：type 白名单/scope 白名单/subject 含中文）
3. push main 源码（竞态：他人刚推过 → 自动 `pull --rebase` 重试一次）
4. 推 dist 到 gh-pages 产物分支 → Pages 秒级 serve（无 CI 构建，秒级可见）

发布失败（任何一步）：修复问题后重新 `mb publish`——各步幂等，锁保证不会双发。

## 整篇导入发布（长文章首选）

行号编辑适合小改动；长文章或已有成稿直接 `mb publish-file` 整篇导入：

```bash
mb publish-file /path/to/文章.md                                    # 文件自带 frontmatter：一条命令搞定
mb publish-file /path/to/草稿.txt --title "标题" --tags a,b --column c   # 无 frontmatter：命令行补缺
```

规则：
- 文件带 YAML frontmatter（`---` 头）时，title/date/tags/column **以文件为准**，命令行参数只补缺
- 文件无 frontmatter 时 `--title` 必填；date 默认今日（自动引号）
- slug 默认取文件名（去扩展名转 kebab-case）；中文文件名需 `--slug` 显式指定
- 自动检测编码（UTF-8 BOM / UTF-8 / GBK），Windows 记事本存的 `.txt` 也不乱码
- 默认导入后立即 `mb publish`；`--no-publish` 只导入不发布
- slug 已存在时报错（防误覆盖），需先 `mb rm` 或换 `--slug`

## frontmatter 字段约定（AGENTS.md 摘要）

| 字段 | 必填 | 说明 |
|---|---|---|
| title | ✓ | 标题（含冒号时 CLI 自动引号） |
| date | ✓ | `'YYYY-MM-DD'`（CLI 自动引号——裸日期会构建失败） |
| description | ✗ | 摘要 |
| column | ✗ | 专栏名 |
| tags | ✗ | `[a, b]` |
| columnOrder | ✗ | 专栏内排序（整数，小在前） |

文件必须 UTF-8 无 BOM（CLI 读写自动防呆）。

## 常见错误

| 场景 | 表现 | 处理 |
|---|---|---|
| 用旧 hash 编辑 | exit 2「hash 冲突」 | 重新 `mb lines` 取新 hash |
| 锁被占 | exit 3「正被其他操作占用」 | 稍后重试；或确认持锁进程已死 → 删 `.mb-lock` |
| frontmatter 结构被行编辑破坏 | 拒绝并提示「改用 mb meta set」 | 用 meta 子命令改头部字段 |
| date 忘引号 | — | 不会发生：new/set 自动补引号 |
| slug 非法 | exit 1 | 小写短横线（`my-post`），NEVER 大写/斜杠 |
