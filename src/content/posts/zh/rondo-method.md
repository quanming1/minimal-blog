---
title: Rondo 方法：PRD 驱动 × Agent 约束的 AI 结对开发
date: '2026-08-13'
description: 从 rondo 项目的实战约束中提炼的一套 AI 结对开发规范——先 PRD 后开发、AGENTS.md 硬约束、TODO 清单驱动，让 AI 与人类在同一套规则下协作。
tags: [工程实践, AI Agent, 开发流程]
---

AI 结对开发最大的问题不是「AI 能力不够」，而是「AI 每次都是新人」——它没有项目记忆、不知道你的约定、容易在错误的地方白干。rondo 项目（YAML 驱动的 LLM 工作流编排工具，claude-code 深度参与开发）用一套写进仓库的约束体系解决了这个问题。

这套体系我从头到尾实践过、踩过坑、修过补丁，现在把它提炼成一套可复制的规范，取名为 **Rondo 方法**：三个支柱 + 一个闭环 + Git Flow 配套。

## 为什么需要一套规范

> [!WARNING]
> 如果每次开新任务都要口头叮嘱 agent「记得先读文档、别乱改文件、提交要规范」，说明你的项目缺少**机器可读的约束**。

AI agent 没有上下文记忆，它唯一稳定的输入是**当前仓库里的文件**。所以约束必须写进仓库、能被读取、能被强制——这三点是 Rondo 方法的出发点。

## 支柱一：PRD 驱动开发

**先 PRD，后开发**——每个阶段开工前，必须有定稿（`approved`）的 PRD：

- **PRD 是开发的唯一依据**：需求、实现、测试、验收全部对照 PRD；禁止开发 PRD 未定义的内容
- **一阶段一 PRD**：每个 TODO 阶段对应一份 `docs/prd/PRD-<阶段>-<名称>.md`，从模板复制
- **变更走记录**：`approved` 之后需求变更，必须在 PRD 追加「变更记录」（日期 + 变更内容 + 理由），并重新过一遍验收标准
- **验收不通过 = 未完成**：PRD 的「验收标准」逐条核对，全部通过才更新 TODO / CHANGELOG、进入下一阶段

> [!TIP]
> PRD 模板的价值在于**结构即纪律**——它强制你写清「非目标」（防止范围蔓延）和「可执行的验收标准」（防止「看起来不错」）。模板全文见文末资产。

## 支柱二：AGENTS.md 硬约束

`AGENTS.md` 是仓库里对所有 AI agent（claude-code / 其他协作 agent）和人类协作者的行为规范，**动手前必须完整阅读并遵守**。它把最容易翻车的事情全部写成硬规则：

```text
# 工作方式
- 严格按 docs/TODO.yaml 的阶段顺序推进，不跳步、不越权
- 动手前先读相关文档与现有代码，遵循已有模式；不另起一套并行模式
- 不引入未声明的依赖；只改任务范围内的文件

# 语言与风格
- 注释、docstring、提交信息、文档统一中文；代码标识符保持英文
- 注释写「为什么」而非「是什么」；禁用 emoji

# Git 强制
- main 永不直接提交；develop 只接受 merge 合入
- feat/fix 的 scope 必须与分支名中的阶段 id 交叉校验
- 规范不靠自觉，全部由 .githooks/ 本地 hook 强制
```

关键设计：**规则要能被机器校验**。commit-msg hook 解析 `TODO.yaml` 实时比对阶段 id，写错直接拒绝并列出全部可用阶段——人工 review 会疲劳、会「这次破例」，hook 不会。

## 支柱三：TODO 清单驱动

`docs/TODO.yaml` 是**开发的唯一执行依据**——结构化任务清单，按路线图分阶段展开：

```yaml
stages:
  - id: A
    name: 地基
    steps:
      - id: A1
        title: CLI 骨架 + 配置系统 + 多 Provider 抽象
        status: done
        prd: docs/prd/PRD-A1-cli-config.md
        acceptance: 全部通过——pytest 20 passed、ruff 全过
```

- 每步含：**涉及模块 / 验收标准 / 状态**（done / in_progress / todo）
- **状态联动**：立项时标 `in_progress`，验收通过才改 `done`；PRD 生命周期（草稿 → approved → 开发中 → 已验收）同步推进
- **机器消费**：commit hook 直接读它校验阶段 id——TODO 不是给人看的清单，是给工具用的数据

## 六步闭环

```
立项 → 评审 → 开发 → 验证 → 收尾 → 发布（可选）
```

| 步骤 | 动作 | 产物 / 状态 |
|---|---|---|
| 1. 立项 | 从 TODO 选定阶段，撰写 PRD | `PRD-<阶段>-<名称>.md`（草稿） |
| 2. 评审 | 逐条核对需求与验收标准 | PRD `approved`（定稿后冻结） |
| 3. 开发 | 按 PRD 实现；`feature/<阶段>-<任务>` 分支 | 代码 + 测试 |
| 4. 验证 | 对照 PRD 验收标准逐条执行（pytest / ruff / 手动） | 全部通过 → 收尾；失败 → 回开发 |
| 5. 收尾 | 更新 CHANGELOG、TODO 状态、PRD `已验收` | 合并回 develop 并推送 |
| 6. 发布 | release 分支 + 版本冻结 + 回归 + tag | `release/<ver>` → main |

## Git Flow 配套

- **分支模型**：`main`（只放发布版）→ `develop`（日常集成，只接受 merge）→ `feature/<阶段id>-<任务>` / `release/<ver>` / `hotfix/<name>`
- **提交规范**：`<type>(<scope>): <subject>`，subject 中文；feat/fix 的 scope 必须是 TODO 里真实存在的阶段 id；feat 额外强制暂存必须包含对应 PRD（行为变更同步文档）
- **机器强制**：`.githooks/commit-msg` 校验 type 白名单 / 阶段存在性 / feat 带 PRD / perf 带真实 FR / 分支名交叉校验；`.githooks/pre-push` 保护 main 与 develop
- **AI 与人类同规则**：没有「agent 可以特殊」的例外——这正是约束能被长期执行的关键

## 关键文件资产

整套规范的核心文件已抽取为资产，随本文发布。下载后改造成自己的项目即可：

> [!asset] rondo-method/AGENTS.md
> 给 AI agent 的强制行为规范全文——工作方式 / 代码风格 / Git Flow / 测试 / 文档 / PRD 驱动 / 安全边界。这是整套约束的入口文件。

> [!asset] rondo-method/PRD-TEMPLATE.md
> PRD 文档模板——结构即纪律，强制写清非目标与可执行的验收标准。

> [!asset] rondo-method/PRD-A1-cli-config.md
> 真实 PRD 样例（rondo A1 阶段，已验收）——展示一份定稿 PRD 长什么样，含已勾选的 FR/AC 与变更记录。

> [!asset] rondo-method/TODO.yaml
> 结构化任务清单示例——按阶段展开、每步含模块与验收标准、可被 hook 机器消费。

> [!TIP]
> 完整的 6 个文件（另含 `PROCESS.md` 推进管理办法和 `README.md` 资产说明）见资产包目录；每个文件的用途与最小落地组合（单人 + AI agent 项目该带哪几个）都写在 `README.md` 里。

## 落地裁剪

Rondo 方法是 rondo 项目的实战沉淀，规模可大可小：

- **最小组合**：`AGENTS.md` + `PROCESS.md` + `PRD-TEMPLATE.md`——管住「agent 怎么干活」
- **中等规模**：加 `TODO.yaml`——有阶段推进、有状态联动
- **完整形态**：加 Git Flow + hook 强制——连提交都机器校验

==核心原则只有一条==：**约束写进仓库、能被读取、能被强制，AI 与人类同规则**。至于细节（分支模型要不要 develop、scope 用阶段 id 还是模块名），按项目规模裁剪——规范是护栏，不是迷宫。

> [!IMPORTANT]
> 这套方法在 rondo 里已经跑通了完整闭环：从 A1 地基到 C2 multi-loop 编排，上百条提交全部可追溯到具体阶段，PRD 与代码始终同步，没有一条「无意义提交」。它解决的不是「AI 会不会写代码」，而是「AI 写的东西怎么不失控」。
