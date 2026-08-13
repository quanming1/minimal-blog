# 规范落地模板（examples）

> 本目录是「团队开发流程规范」（`../DEVELOPMENT_FLOW.md`）的可落地文件集合。
> 其他项目**直接复制本目录**到自己的仓库，替换占位符 + 按项目裁剪，即可获得一整套
> 可机器强制的开发流程（全 PR 流 + 提交规范 + PRD 驱动 + 存量反推）。

## 文件清单

```
examples/
├── AGENTS.md                    # 对 AI agent 与人类协作者的行为规范（强制入口）
├── docs/
│   ├── PROCESS.md               # 推进管理办法（六步闭环 + 状态联动 + 存量反推）
│   ├── TODO.yaml                # 结构化任务清单（阶段 id 唯一事实源，hook 机器消费）
│   └── prd/
│       ├── PRD-TEMPLATE.md      # PRD 模板（新阶段从模板复制）
│       └── PRD-example.md       # 示例 PRD（已验收形态 + 变更记录留痕示范）
└── .githooks/
    ├── commit-msg               # commit 校验包装（sh）
    ├── check_commit_msg.py      # commit 校验逻辑（Python，含「裁剪点」配置区）
    └── pre-push                 # push 保护（全 PR 流：develop/main 三重保护）
```

## 落地步骤（新项目）

```bash
# 1. 复制模板到项目仓库
cp -r examples/* <你的项目>/

# 2. 启用 hooks（仓库内执行一次）
git config core.hooksPath .githooks

# 3. 替换占位符
#    AGENTS.md —— 替换所有 <尖括号> 占位符（项目名/技术栈/lint 工具等）
#    docs/TODO.yaml —— 按项目实际路线图改写阶段结构
#    docs/prd/PRD-*.md —— 从模板创建第一个未来阶段的 PRD

# 4. 验证 hooks 生效
git commit -m "feat(X9): 测试"        # 应被拒绝（X9 不存在于 TODO.yaml）
git push origin feature/x:develop     # 应被拒绝（全 PR 流）
```

## 落地步骤（存量项目，已有代码无 PRD/TODO）

按 `AGENTS.md` §10 / `docs/PROCESS.md` §7 的**反推流程**：

1. `git log` 梳理演进 → 2. 分阶段 → 3. 补 `docs/TODO.yaml` → 4. 补各阶段 PRD（状态按实际，无法核实的标"待复核"）→ 5. 启用 hooks → 6. 新需求从此走六步闭环。

也可以用 `DEVELOPMENT_FLOW.md` §8.4 的**一键落地提示词**发给 AI 协作者，让它读完规范后自动完成反推与落地。

## 裁剪指南

| 场景 | 裁剪点 |
|---|---|
| 单人 / 微型项目 | 去掉 PRD 六步闭环；`check_commit_msg.py` 里 `PHASE_SCOPED_TYPES` 置空，scope 走模块名 |
| 前端项目 | `AGENTS.md` §3 换前端工具链；`check_commit_msg.py` 顶部 `MODULE_SCOPES` 换组件/包名 |
| 不用 PRD | 删 PRD 模板与示例；feat 带 PRD 校验自动跳过（无 PRD 文件） |
| 单 main 分支 | 删 develop/feature 模型，`pre-push` 只留 main 保护 |
| 无多平台需求 | `AGENTS.md` §9 矩阵减为单平台 |

## 文件依赖关系

```
AGENTS.md（行为入口）
  ├── docs/TODO.yaml            ← 阶段 id 事实源（hook 读取）
  ├── docs/PROCESS.md           ← 六步闭环怎么走
  └── docs/prd/PRD-*.md         ← 阶段契约（feat 提交必须同步变更记录）
.githooks/commit-msg            ← 校验提交（读 TODO.yaml + PRD）
.githooks/check_commit_msg.py   ← 校验逻辑（裁剪点在此）
.githooks/pre-push              ← 保护 main/develop（全 PR 流）
```

## 完整规范文档

- `../DEVELOPMENT_FLOW.md`——12 章完整规范（核心原则 / flowchart / 分支 / PR / 提交 / 六步闭环 / 存量反推 / 质量门槛 / hooks / 工作流 / 落地清单 / 常见错误）
- Rondo 方法文章：https://quanming1.github.io/minimal-blog/posts/rondo-method/
