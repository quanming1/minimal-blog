# rondo 项目开发规则（AGENTS.md）

本文件是 rondo 仓库对**所有 AI agent**（claude-code / comanda 工作流 / 其他协作 agent）以及人类协作者的行为规范。
任何人在本仓库动手前，必须完整阅读并遵守本文件；git 操作**强制遵循 Git Flow**（见 §4）。

## 1. 项目概况

- **rondo**：YAML 驱动的 LLM 工作流编排工具（Python 3.12+ 从零实现，灵感来自 comanda）
- 当前阶段：A1-A3（地基）/ C1（agentic loop）/ C2（multi-loop flow 编排）已完成，G1 测试与 CI / G2 文档进行中——详见 `docs/TODO.yaml` 的状态标记
- 关键文档：
  - `docs/ROADMAP.md` — 12 步路线图（演进顺序 + 历史教训）
  - `docs/TODO.yaml` — 结构化 TODO 清单（**开发的唯一执行依据**）
  - `docs/FEASIBILITY.md` — Python 复刻可行性分析

## 2. 工作方式

1. **严格按 `docs/TODO.yaml` 的阶段顺序推进，不跳步、不越权**——每步只做该步清单内的任务。
2. 每阶段完成标准：代码 + 测试 + 文档 + 可独立验收（对照 TODO 中的「验收」条目）。
3. 动手前先读相关文档与现有代码，遵循已有模式与风格；不另起一套并行模式。
4. 不引入未声明的依赖；用任何库前先确认已在 `pyproject.toml` 声明。
5. 只改任务范围内的文件；不做用户没要求的额外改动。
6. 同一问题反复改不好就停下，回到初始假设重新判断，换方向。

## 3. 代码风格（Python）

- Python 3.12+，**类型注解完整**（函数签名、数据类字段）。
- 格式化：**ruff**（black 风格），导入排序 isort。
- 命名：`snake_case` 函数/变量、`PascalCase` 类、`UPPER_SNAKE_CASE` 常量。
- 每个模块文件头部有 docstring 说明职责。
- 数据结构优先 `dataclasses.dataclass`（对标 comanda 的 struct）。
- 并发用 `asyncio`；需要锁的地方必须注释说明保护对象。
- **注释要求**：模块头部 docstring 说明职责；复杂逻辑必须写注释，注释写「为什么」而非「是什么」（函数签名用类型注解表达「是什么」）。
- **语言规范**：所有注释、docstring、提交信息、文档统一使用**中文**；代码标识符、类型名、命令名、commit 的 type/scope 保持英文。
- **禁用 emoji**：代码、注释、docstring、文档、提交信息、终端输出一律**不使用 emoji**（含对勾、叉号、方形/圆形符号、红黄绿灯标等符号字符，即任何非文本符号）；状态用文字（已完成 / 未开始 / 进行中）或 ASCII 标记（[x] / [ ] / [~]）表示。

## 4. Git Flow 规范（强制）

### 4.1 分支模型

```
main            ← 仅存放可发布版本（受保护语义：永不直接提交）
  └─ develop    ← 日常集成分支（默认工作基底）
       ├─ feature/<name>   新功能 / 新任务
       ├─ release/<ver>    发布准备（版本号冻结、回归测试）
       └─ hotfix/<name>    生产紧急修复（从 main 切出，修完回灌 main + develop）
```

### 4.2 分支规则

- 默认工作分支是 **develop**；main 永不直接提交代码；**develop 同样禁止直接提交，只接受 feature/* → merge 合入**（pre-push hook 强制）。
- 每个任务/功能开独立分支：`git checkout -b feature/<阶段id>-<short-name> develop`，**feat/fix 分支名必须关联 TODO 阶段 id**（如 `feature/A2-config`、`feature/fix-c1-checkpoint`，大小写不敏感）。
- **交叉校验**：feat/fix 提交的 scope 必须与分支名中的阶段 id 一致（commit-msg hook 强制）；分支名不含阶段 id 时 feat/fix 提交直接拒绝。
- 描述部分用短横线分隔小写（如 `feature/A2-config-system`）。
- 规划类专用分支：`prd-update`（PRD 文档提交）、`todos-update`（TODO 文档提交），见 §4.3。

### 4.3 提交规范（Conventional Commits）

<type>(<scope>): <subject>

示例：
  feat(A2): 添加变量替换
  fix(C1): checkpoint 落盘修复（修复 C1 阶段的功能）
  docs(roadmap): 明确 C1 验收标准
  refactor(processor): 抽取变量替换逻辑到 utils
  test(models): 添加 provider 路由单元测试
```

- **subject 使用中文**（type/scope 保持英文约定）。

- type：`feat` / `fix` / `prd` / `todos` / `docs` / `refactor` / `test` / `style` / `chore` / `perf`
- **scope 分三类**：
  - `feat` / `fix` / `prd` / `todos`：scope **必须**是 TODO 阶段标识（如 `A1` / `C2` / `G1`；阶段超过 Z 用列号风格 `AA1`、`AB1`），且**必须真实存在于 `docs/TODO.yaml`**（commit-msg hook 强制校验，防写错阶段号）——feat/fix 表明改动属于/修复哪个阶段的功能；prd/todos 表明规划哪个阶段的文档
  - `feat` 额外强制：暂存必须包含对应阶段 PRD（`docs/prd/PRD-<scope>-*.md`）——行为变更必须同步 PRD 变更记录（无 PRD 的基建阶段如 G1 跳过）
  - `perf`：scope 必须带 FR 引用（`perf(C2-FR6)` / `perf(C2-FR6,FR8)`），引用的 FR 编号必须真实存在于对应 PRD——perf = 优化完善已有描述（本仓库语义，接受与标准 perf=性能 的偏差）
  - `prd` / `todos` 额外强制：只在 `prd-update` / `todos-update` 分支下提交，且暂存文件必须全部在 `docs/` 下（规划与代码隔离）
  - 其他 type：scope 用模块名 `cli` / `config` / `models` / `processor` / `agentic` / `loop` / `skills` / `memory` / `server` / `tui` / `index` / `docs` / `tests`
- **一条提交只做一件事**；禁止 `fix stuff`、`update`、`misc` 这类无意义 message。
- **本地强制**：`.githooks/commit-msg` hook 在每次 commit 时校验上述规则（type 白名单、阶段格式与存在性、feat 带 PRD、perf FR 引用、prd/todos 分支与文档-only 约束、分支名交叉校验），不符合直接拒绝提交；`git config core.hooksPath .githooks` 已配置（新 clone 后需执行一次）。
- 提交前自查：`git status` 确认无多余文件；`git diff` 通读改动。
- **提交规范完整定义见 `docs/COMMIT.md`**（type 定义表、scope 规则、常见错误、hook 机制）。

### 4.4 合并策略

- `feature/*` → `develop`：**`git merge --no-ff feature/xxx`**（保留合并提交，不 squash 历史）。
- **develop 只接受 merge 合入**：禁止直接 commit 到 develop（pre-push hook 校验推送时 develop 新增提交必须全部是 merge commit）。
- **develop 与 main 之间禁止本地直接 merge，一律走 GitHub PR/MR（Code Review）**：
  - `develop` → `main`：走 `release/*` 分支，合入时在 GitHub 上提 PR（`release/* → main`），不本地 `git merge`。
  - `main` → `develop`：hotfix 回灌同样走 PR（`main → develop` 的 PR），不本地 `git merge`。
  - pre-push hook 强制：本地 main 领先远程的新增提交含本地 merge commit 时拒绝 push（PR 合入在 GitHub 服务器端完成，本地 main 只 `pull` 同步）。
- `hotfix/*` → `main`：紧急修复从 main 切出，修完以 PR 合入 main，再以 PR 回灌 develop。
- **禁止 rebase 重写已推送历史**；合并前必须解决冲突且测试通过。

### 4.5 版本与 tag

- 语义化版本 SemVer：`MAJOR.MINOR.PATCH`，当前 `0.0.x`（0.x 阶段）。
- 每次发布在 main 打 tag：`v<version>`（如 `v0.0.1`）。
- 版本号集中管理：`rondo/__init__.py` 的 `__version__` 与 `pyproject.toml` 同步。

### 4.6 禁止事项

- 直接向 main 提交 / 推送代码。
- 在 develop 之外的长期分支堆积未合并工作。
- 把 secrets / API key / 配置文件（`~/.rondo/config.yaml`）提交进仓库。
- 遗留临时文件、调试代码、`.bak`、未使用的死代码。

### 4.7 本地保护（pre-push hook）

- 仓库内置 `.githooks/pre-push`：
  - **禁止把非 main 分支直接 push 到 main**（`git push origin main` 发布推送除外；禁止删除远程 main）。
  - **禁止直接提交到 develop**——推送 develop 时，新增提交必须全部是 merge commit（≥2 个父提交），任何直接 commit 都拒绝推送；开发一律走 `feature/*` → `merge --no-ff` → push develop。
- clone 后执行一次：`git config core.hooksPath .githooks`（已配置的仓库可跳过）。
- 说明：GitHub free 账号的 private 仓库无法开启服务端 branch protection，此 hook 是本地强制替代；AI agent 与人同规则。

### 4.8 标准流程（每次任务）

```bash
git checkout develop && git pull          # 1. 同步基底
git checkout -b feature/<task>            # 2. 开任务分支
# ... 开发 + 本地测试（pytest / ruff）...
git add <改动文件>                          # 3. 提交（conventional）
git commit -m "feat(scope): 描述"
git checkout develop && git merge --no-ff feature/<task>   # 4. 合并回 develop
git push origin develop                   # 5. 推送
```

## 5. 测试

- 测试框架：**pytest**（`tests/` 目录，镜像包结构）。
- 每个新功能必须配测试；每个 bug 修复必须配回归测试（对标 comanda 每 feature 带测试的历史惯例）。
- 提交/合并前本地必须通过：`pytest` + `ruff check .`。
- 测试不依赖真实 API key——用 mock/fake provider（参考 comanda `dsl_mocks_test.go` / `MockProvider`）。

## 6. 文档

- 新模块 / 新命令 / 行为变更必须同步更新 `docs/` 与 `README.md`。
- **日志与变更记录（强制）**：
  - 每次功能 / 修复 / 行为变更完成，必须同步更新 `CHANGELOG.md`（追加到 `[未发布]` 对应小节）。
  - 重大架构决策记入对应阶段 PRD 的「变更记录」（日期 + 决策 + 理由，PRD 是决策的唯一事实源）。
  - 提交历史是项目的执行日志：commit message 必须可追溯（对应 TODO 条目），禁止合并杂乱提交。
- 代码注释写「为什么」而非「是什么」。

## 8. PRD 驱动开发（强制）

- **先 PRD，后开发**：每个 TODO 阶段开工前，必须先在 `docs/prd/` 创建对应 PRD（命名 `PRD-<阶段>-<名称>.md`，从 `docs/prd/PRD-TEMPLATE.md` 复制），评审定稿（状态 `approved`）后才能开发。
- **PRD 是开发的唯一依据**：需求、实现、测试、验收全部对照 PRD；禁止开发 PRD 未定义的内容；范围变更必须走 PRD「变更记录」。
- **验收按 PRD 标准**：每阶段完成必须按 PRD「验收标准」逐条核对，全部通过才算完成（不通过不更新 TODO / CHANGELOG）。
- 推进管理办法详见 `docs/PROCESS.md`。

## 9. 安全与边界

- 不引入 / 记录 secrets；API key 只存 `~/.rondo/config.yaml`（该路径已 .gitignore）或环境变量。
- 工具执行的黑名单参照 comanda `tool_executor.go` 的 `DefaultDenylist`（危险命令 40+ 条）。

## 10. 兼容性要求（强制）

### 10.1 跨平台（Windows / Linux / macOS）

- 路径一律用 `pathlib.Path` 处理，禁止硬编码分隔符（`\` 或 `/`）与盘符；拼接用 `Path` / `os.path.join`。
- 禁止依赖平台特有命令或 shell 语法（cmd / PowerShell / bash 专属写法）；执行子进程用 `subprocess.run(args_list, shell=False)`，参数以列表显式传入。
- 环境变量用 `os.environ` / `os.getenv` 读取，不假设默认 shell 或 PATH 内容。
- 源文件统一 LF 换行（提交时保留原风格）；逻辑不依赖 `\r\n` 或 `\n` 的特定行为。
- 终端输出：Windows 控制台编码差异（GBK）不得影响功能正确性；面向用户的输出统一按 UTF-8 语义处理。

### 10.2 编码

- 所有文件读写显式指定 `encoding="utf-8"`（配置文件、工作流 YAML、输出文件、日志）。
- 读取用户输入文件时兼容常见编码（UTF-8 / UTF-8 BOM / GBK / GB18030）：优先 UTF-8 与 UTF-8-SIG，失败则按顺序回退 GBK / GB18030；必要时引入编码检测库（如 charset-normalizer，需先声明到 pyproject.toml）。
- 禁止向终端 / 文件输出乱码（mojibake）；涉及编码回退的功能必须有测试覆盖（GBK 文件、BOM 文件、混合编码目录）。

### 10.3 测试与 CI

- CI 必须覆盖主要平台：`ubuntu-latest` + `windows-latest` + `macos-latest` 矩阵（见 `.github/workflows/ci.yml`）。
- 涉及路径、编码、子进程的功能必须有跨平台测试用例；本地提交前至少保证当前平台 pytest + ruff 全绿。
- Windows 下已知坑：控制台 GBK 显示、`%TEMP%` 路径解析、git 换行转换——相关逻辑要有针对性测试。
- 不在工作区留临时文件；调试产物放系统临时目录，用完即清。
