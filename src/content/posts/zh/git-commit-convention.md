---
title: 我们的 Git 提交规范与流程
date: '2026-08-13'
description: 从 Conventional Commits 到本地 hook 强制：一套可追溯、可生成、防手滑的提交体系是怎么设计的。
tags: [git, 提交规范, 工程实践]
---

提交信息是项目最细粒度的「执行日志」。回看历史时，`fix stuff`、`update`、`misc` 这类消息等于什么都没说——改了什么、属于哪个功能阶段、为什么改，全部丢失。

这篇介绍我们项目里落地的一套提交规范：以 Conventional Commits 为基础，加上**阶段关联、PRD 同步、分支交叉校验、本地 hook 强制**，让每条提交都可追溯、可被工具消费、出错当场被拦下。

## 为什么需要提交规范

- **可追溯**：每条提交都能对应到开发清单的具体阶段，回看历史就知道「这一步是给哪个阶段写的」
- **可生成**：规范的 `<type>(<scope>)` 结构可被工具消费——自动生成 CHANGELOG、代码审查筛选、版本发布
- **防手滑**：阶段号写错、type 拼错，在提交时被本地 hook 当场拦下，而不是污染历史

> [!TIP]
> 规范不是「给别人看的仪式」，它首先是给**未来的自己**用的检索索引。三个月后 `git log --grep=feat` 能精确捞出所有功能变更，这价值远超写规范本身花的时间。

## 格式：`<type>(<scope>): <subject>`

```text
feat(A2): 添加变量替换
```

- `type`：提交类型，白名单 10 种（见下）
- `scope`：作用域，按类型分三类规则
- `subject`：一句话描述，**中文**（type/scope 保持英文）

需要补充说明时用正文段落（写「为什么」而不是「做了什么」）：

```bash
git commit -m "feat(C2): 添加 loop 编排器" \
           -m "input_state/output_state 传递，对齐 comanda 的 orchestrator 设计"
```

## type 白名单（10 种）

| type | 含义 | 示例 |
|---|---|---|
| `feat` | 新功能 / 行为变更（必须同步 PRD 变更记录） | `feat(A2): 添加变量替换` |
| `fix` | 修复 bug（标注修复的是哪个阶段） | `fix(C1): checkpoint 落盘修复` |
| `docs` | 文档变更 | `docs(roadmap): 明确 C1 验收标准` |
| `refactor` | 重构（行为不变） | `refactor(processor): 抽取变量替换逻辑` |
| `test` | 测试相关 | `test(models): 添加 provider 路由测试` |
| `style` | 格式 / 风格（不影响行为） | `style(cli): 统一参数顺序` |
| `chore` | 构建 / 工具 / 杂项 | `chore(tests): 更新 CI 依赖版本` |
| `perf` | 优化完善（语义见 scope 规则） | `perf(C2-FR6): 完善 flow 日志格式` |
| `prd` | PRD 文档（专用分支） | `prd(C2): 添加 multi-loop 编排 PRD` |
| `todos` | TODO 清单 / 规划文档（专用分支） | `todos(G1): 更新测试进度` |

## scope 三套规则

scope 不是随便写的，按 type 分三类：

**1. 功能 / 规划类 → TODO 阶段标识**

`feat` / `fix` / `prd` / `todos` 的 scope 必须是开发清单里的阶段 id（如 `A1`、`C2`），且**必须真实存在**——hook 解析清单实时比对，阶段号写错直接拒绝，并列出全部可用阶段。

```bash
git commit -m "feat(A2): 添加变量替换"   # 合法
git commit -m "feat(ZZ9): 新功能"        # 拒绝：ZZ9 不存在
```

**2. 优化类 → 阶段 id + FR 引用**

`perf` 表示「优化完善已有描述」（本仓库语义，接受与标准 perf=性能 的偏差）。scope 必须带 FR 引用，且**引用的 FR 编号必须真实存在于对应 PRD**：

```bash
git commit -m "perf(C2-FR6): 完善 flow 日志格式"     # 单 FR
git commit -m "perf(C2-FR6,FR8): 优化条件解析"       # 多 FR
```

**3. 其他类 → 模块名**

`docs` / `refactor` / `test` / `style` / `chore` 用模块 scope，不强绑阶段：

```
cli / config / models / processor / agentic / loop / skills / memory / server / tui / index / docs / tests
```

```bash
git commit -m "refactor(processor): 抽取变量替换逻辑到 utils"
```

## 三条特殊约束

**feat 必须同步 PRD**：功能提交的暂存文件必须包含对应阶段 PRD——行为变更要在 PRD 的「变更记录」里追加说明。这条把「改代码」和「改文档」绑在一起，防止代码演进了、文档还停留在旧描述。

**prd / todos 专用分支**：规划类提交必须在 `prd-update` / `todos-update` 分支下进行，且暂存文件**只能**是 `docs/` 下的文档——规划与代码物理隔离，杜绝「写 PRD 时顺手改了代码」的混交提交。

**分支名交叉校验**：`feat` / `fix` / `perf` 的分支名必须关联阶段 id，且提交 scope 必须与分支名**一致**：

```bash
git checkout -b feature/A2-config develop
git commit -m "feat(A2): 添加变量替换"   # 合法：分支 A2 == scope A2
git commit -m "feat(C1): 添加循环引擎"    # 拒绝：分支 A2 != scope C1
```

这条防止在错误的分支树上白干——提交时发现自己要写 C1 的东西却在 A2 分支，当场暴露。

## 本地强制：hook 不靠自觉

所有规则都由本地 git hook 强制，不符合直接拒绝提交，**不依赖人的自觉**：

- **commit-msg hook**：每次提交校验 type 白名单、阶段存在性、feat 带 PRD、perf 带真实 FR、prd/todos 专用分支与文档-only、分支名交叉校验
- **pre-push hook**：`develop` 禁止直接提交（推送时新增提交必须全部是 merge commit），`main` 永不直接提交

> [!IMPORTANT]
> 规范能被长期执行的关键不是文档写得细，而是**把检查交给机器**。人工 review 会疲劳、会遗漏、会「这次破例」，hook 不会。

## Git Flow 标准流程

分支模型：

```text
main            ← 仅存放可发布版本
  └─ develop    ← 日常集成分支（只接受 merge 合入）
       ├─ feature/<阶段id>-<任务>   新功能
       ├─ release/<ver>            发布准备
       └─ hotfix/<name>            紧急修复
```

每个任务的完整流程：

```bash
# 1. 同步基底
git checkout develop && git pull
# 2. 开任务分支（名字带阶段 id）
git checkout -b feature/C2-flow develop
# ... 开发 + 本地测试（pytest / ruff）...
# 3. 提交（conventional，hook 自动校验）
git add <改动文件>
git commit -m "feat(C2): 添加 flow 编排器"
# 4. 合并回 develop（保留合并提交，不 squash）
git checkout develop && git merge --no-ff feature/C2-flow
# 5. 推送（pre-push 校验 develop 全是 merge 提交）
git push origin develop
```

合并用 `--no-ff` 保留合并提交，历史里能清楚看到「哪批提交组成了一个功能」；`develop` 只接受 merge 合入，杜绝直接 commit 绕过 review 语义。

## 常见错误速查

| 错误写法 | 问题 | 正确写法 |
|---|---|---|
| `feat: 新功能` | 缺 scope | `feat(A2): 新功能` |
| `feat(config): 新功能` | feat 用了模块 scope | `feat(A1): 新功能` |
| `prd(C2): 写 PRD`（在 develop 上） | prd 必须在 prd-update 分支 | `git checkout -b prd-update develop` |
| `todos(G1): 更新`（暂存含代码） | todos 只准改 docs/ | 只 add docs/ 下文件 |
| `feat(AA9): 修复` | 阶段 id 不存在 | 用清单里真实的 id |
| `feat(C2): 新功能`（没带 PRD） | feat 必须同步 PRD 变更记录 | 先更新 PRD 再提交 |
| `perf(C2): 优化` | perf 必须带 FR 引用 | `perf(C2-FR6): 优化` |
| `update xxx` | 无 type/scope，无意义 | `chore(tests): 更新依赖` |
| 一行提交多件事 | 无法追溯 | 拆成多条提交 |

## 小结

一套提交规范要真正活下来，三件事缺一不可：**格式简单**（type/scope/subject 一行）、**规则可机器校验**（hook 强制而非自觉）、**与开发流程绑定**（阶段 id 关联清单、feat 绑定 PRD、分支交叉校验）。

这套体系在我们的 rondo 项目（YAML 驱动的 LLM 工作流编排工具）里落地并运行良好——上百条提交全部可追溯到具体阶段，CHANGELOG 可自动生成，历史里没有一条「无意义提交」。

> [!WARNING]
> 规范是手段不是目的。如果某个规则让你频繁绕路或「忘了为什么」，说明它值得重新审视——好的规范应该像护栏，而不是迷宫。
