---
title: Rondo 方法：PRD 驱动 × Agent 约束的 AI 结对开发
date: '2026-08-13'
description: 从 rondo 项目的实战约束中提炼的一套 AI 结对开发规范——先 PRD 后开发、AGENTS.md 硬约束、TODO 清单驱动，让 AI 与人类在同一套规则下协作。
column: Rondo 方法
tags: [工程实践, AI Agent, 开发流程]
---

AI 结对开发最大的问题不是「AI 能力不够」，而是「AI 每次都是新人」——它没有项目记忆、不知道你的约定、容易在错误的地方白干。rondo 项目用一套写进仓库的约束体系解决了这个问题。

这套体系我完整实践过，现在提炼为 **Rondo 方法**：三个支柱 + 一个流程闭环 + 一套变更纪律。本文用半结构化方式呈现，可直接照做。

## 1. 为什么需要一套规范

> [!WARNING]
> 如果每次开新任务都要口头叮嘱 agent「记得先读文档、别乱改文件、提交要规范」，说明你的项目缺少**机器可读的约束**。

AI agent 没有上下文记忆，它唯一稳定的输入是**当前仓库里的文件**。所以约束必须满足三条：

| 约束性质 | 含义 | 手段 |
|---|---|---|
| 写进仓库 | 能被 agent 读取 | AGENTS.md / docs/ 目录 |
| 能被读取 | 路径固定、约定明确 | TODO.yaml / PROCESS.md / PRD |
| 能被强制 | 机器校验而非自觉 | git hooks / CI |

## 2. 三大支柱

### 支柱一：PRD 驱动开发

**先 PRD，后开发**——每个 TODO 阶段开工前，必须有定稿（`approved`）的 PRD：

- PRD 是**开发的唯一依据**：需求、实现、测试、验收全部对照 PRD；禁止开发 PRD 未定义的内容
- **一阶段一 PRD**：`docs/prd/PRD-<阶段>-<名称>.md`，从模板复制
- **验收不通过 = 未完成**：PRD「验收标准」逐条核对，全部通过才更新 TODO / CHANGELOG

> [!TIP]
> PRD 模板的价值在于**结构即纪律**：强制写「非目标」（防范围蔓延）和「可执行的验收标准」（防「看起来不错」）。

### 支柱二：AGENTS.md 硬约束

`AGENTS.md` 是对所有 AI agent 和人类协作者的行为规范，**动手前必须完整阅读并遵守**：

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

关键设计：**规则要能被机器校验**。commit-msg hook 解析 `TODO.yaml` 实时比对阶段 id，写错直接拒绝——人工 review 会疲劳、会「这次破例」，hook 不会。

### 支柱三：TODO 清单驱动

`docs/TODO.yaml` 是**开发的唯一执行依据**——结构化任务清单，按路线图分阶段展开：

```yaml
stages:
  - id: A
    name: 地基
    steps:
      - id: A1
        title: CLI 骨架 + 配置系统
        status: done
        prd: docs/prd/PRD-A1-cli-config.md
        acceptance: 全部通过——pytest 20 passed、ruff 全过
```

- 每步含：**涉及模块 / 验收标准 / 状态**（done / in_progress / todo）
- **状态联动**：立项标 `in_progress`，验收通过才改 `done`；PRD 生命周期同步推进
- **机器消费**：commit hook 直接读它校验阶段 id——TODO 是给工具用的数据，不是给人看的清单

## 3. 开发的所有流程（六步闭环）

> 本节是 Rondo 方法的执行骨架：从需求到上线，每一步都有明确的动作、产物与状态。**任何阶段没有定稿的 PRD 不开工。**

### 3.1 六步闭环

```
立项 → 评审 → 开发 → 验证 → 收尾 → 发布
```

| 步骤 | 动作 | 产物 / 状态 |
|---|---|---|
| 1. 立项 | 从 `docs/TODO.yaml` 选定一个阶段，撰写 PRD | `PRD-<阶段>-<名称>.md`（状态：草稿） |
| 2. 评审 | 逐条核对需求与验收标准，定稿 | PRD 状态：`approved`（定稿后冻结，变更需说明） |
| 3. 开发 | 按 PRD 需求实现；分支 `feature/<阶段>-<任务>` | 代码 + 测试；PRD 状态：开发中 |
| 4. 验证 | 对照 PRD「验收标准」逐条执行（lint / test / build / 手动） | 全部通过 → 进入收尾；失败 → 回开发 |
| 5. 收尾 | 更新 CHANGELOG、TODO 状态 `done`、PRD 状态 `已验收` | 合并回 develop 并推送 |
| 6. 发布 | release 分支 + 版本冻结 + 回归 + tag | `release/<ver>` → main + tag |

### 3.2 PRD 生命周期状态机

PRD 的每个状态迁移都有明确触发条件；**需求变更随时可能打断主流程**，由状态机统一分流：

```text
// ── PRD 生命周期状态机（含需求变更双路径分流）──
// 状态：草稿 → 评审 → approved → 开发中 → 已验收

STATE = 草稿

// 主流程（六步闭环）
立项:   从 TODO.yaml 选阶段 → 复制模板写 PRD → STATE = 草稿
评审:   逐条核对需求与 AC
        → 全部合理 ? STATE = approved（定稿冻结）: 返回草稿修改
开发:   按 PRD 实现（PRD 是唯一依据，不越界）→ STATE = 开发中
验证:   对照 AC 逐条执行（lint / test / build / 手动）
        → 全部通过 ? STATE = 已验收 : 返回开发中（修复后重验）
收尾:   状态联动（PRD 已验收 + TODO done + CHANGELOG 追加）

// ── 需求变更分流（任意状态收到新需求时）──
on 收到新需求:

    // 路径判断：要不要新开 PRD？
    if 需求属于原 PRD 范围（同阶段/同主题/对原 FR·AC 的细化修正）
       and 原 PRD 未进入完全不同的方向:
        → 走【路径 B】修改原 PRD
    else（新阶段 / 全新主题 / 范围跨越原 PRD 边界）:
        → 走【路径 A】新开 PRD

// 路径 A：新开 PRD
路径A:
    TODO.yaml 选定/新增阶段（标 in_progress）
    复制 PRD-TEMPLATE.md → docs/prd/PRD-<阶段>-<名称>.md
    回到主流程【立项】开始

// 路径 B：修改原 PRD
路径B:
    修改原 PRD 正文（更新对应 FR / AC / 技术方案）
    MUST 在 PRD 末尾「变更记录」追加: 日期 + 变更内容 + 理由
    // 修改记录是强制动作——它是需求变更的审计轨迹，不可省略
    MUST 重新核对受影响 AC：
        if STATE == approved:   更新 AC 后保持 approved
        elif STATE == 开发中:   重跑受影响 AC → 通过才继续
        elif STATE == 已验收:   重跑受影响 AC → 不通过则 STATE = 开发中
```

### 3.3 需求变更双路径

需求变更是常态，关键是**先判断再动手**。两个路径的判据：

| 判断维度 | 路径 A：新开 PRD | 路径 B：修改原 PRD |
|---|---|---|
| 阶段 | 新 TODO 阶段 / 跨阶段 | 同一阶段内 |
| 主题 | 全新方向 | 同主题增量/细化 |
| 范围 | 超出原 PRD 边界 | 原 FR/AC 的修正补充 |
| 原 PRD 状态 | 已验收且新需求是另一件事 | 任意状态（含已验收后的小调整） |
| 动作 | 复制模板新建文档，走完整闭环 | 改正文 + **MUST 末尾记变更记录** |

> [!IMPORTANT]
> **路径 B 的纪律**：修改原 PRD 时，MUST 在文档末尾「变更记录」小节追加一行（日期 + 变更内容 + 理由），并重新核对受影响的验收标准。这是需求变更的**审计轨迹**——没有它，PRD 悄悄漂移，代码与文档再次脱节，整个体系就失效了。

## 4. Git Flow 配套

- **分支模型**：`main`（只放发布版）→ `develop`（日常集成，只接受 merge）→ `feature/<阶段id>-<任务>` / `release/<ver>` / `hotfix/<name>`
- **提交规范**：`<type>(<scope>): <subject>`，subject 中文；feat/fix 的 scope 必须是 TODO 里真实存在的阶段 id；feat 额外强制暂存必须包含对应 PRD
- **机器强制**：`.githooks/commit-msg` 校验 type 白名单 / 阶段存在性 / feat 带 PRD / 分支名交叉校验；`.githooks/pre-push` 保护 main 与 develop
- **AI 与人类同规则**：没有「agent 可以特殊」的例外

## 5. 关键文件资产

整套规范的核心文件已抽取为资产，下载后改造成自己的项目即可：

> [!asset] rondo-method/AGENTS.md
> 给 AI agent 的强制行为规范全文——工作方式 / 代码风格 / Git Flow / 测试 / 文档 / PRD 驱动 / 安全边界。这是整套约束的入口文件。

> [!asset] rondo-method/PRD-TEMPLATE.md
> PRD 文档模板——结构即纪律，强制写清非目标与可执行的验收标准；末尾「变更记录」小节是路径 B 的落点。

> [!asset] rondo-method/PRD-A1-cli-config.md
> 真实 PRD 样例（rondo A1 阶段，已验收）——展示一份定稿 PRD 长什么样，含已勾选的 FR/AC 与变更记录。

> [!asset] rondo-method/TODO.yaml
> 结构化任务清单示例——按阶段展开、每步含模块与验收标准、可被 hook 机器消费。

> [!TIP]
> 完整的 6 个文件（另含 `PROCESS.md` 推进管理办法和 `README.md` 资产说明）见资产包目录；每个文件的用途与最小落地组合都写在 `README.md` 里。

## 6. 落地裁剪

Rondo 方法是 rondo 项目的实战沉淀，规模可大可小：

| 规模 | 组合 | 覆盖 |
|---|---|---|
| 最小 | `AGENTS.md` + `PROCESS.md` + `PRD-TEMPLATE.md` | 管住「agent 怎么干活」 |
| 中等 | 加 `TODO.yaml` | 有阶段推进、有状态联动 |
| 完整 | 加 Git Flow + hooks | 连提交都机器校验 |

==核心原则只有一条==：**约束写进仓库、能被读取、能被强制，AI 与人类同规则**。至于细节（分支模型、scope 用阶段 id 还是模块名），按项目规模裁剪——规范是护栏，不是迷宫。

> [!IMPORTANT]
> 这套方法在 rondo 里跑通了完整闭环：从地基到 multi-loop 编排，上百条提交全部可追溯到具体阶段，PRD 与代码始终同步，没有一条「无意义提交」。它解决的不是「AI 会不会写代码」，而是「AI 写的东西怎么不失控」。
