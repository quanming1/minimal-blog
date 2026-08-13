# Rondo 方法资产包

本目录是 [rondo](https://github.com/quanming1/rondo)（YAML 驱动的 LLM 工作流编排工具）实战项目中**真实使用的规范文件**，随《Rondo 方法》一文发布。

> 所有文件原样取自 rondo 仓库（`develop` 分支，2026-08-13），仅转换换行为 LF、编码 UTF-8 无 BOM。你可以直接复制到自己的项目里改造使用。

## 文件清单

| 文件 | 作用 | 建议用法 |
|---|---|---|
| `AGENTS.md` | **给 AI agent 的强制行为规范**——工作方式 / 代码风格 / Git Flow / 测试 / 文档 / PRD 驱动 / 安全边界。任何人在仓库动手前必须完整阅读 | 复制到项目根，让 AI agent（Claude Code / Cursor / 其他）一进来就遵守 |
| `PROCESS.md` | 推进管理办法——PRD 驱动开发的六步闭环（立项→评审→开发→验证→收尾→发布）+ 状态联动 | 与 AGENTS.md 配套，讲清「每个阶段怎么推进」 |
| `TODO.yaml` | 结构化任务清单——按路线图分阶段展开，每步含涉及模块 / 验收标准 / 状态，是开发的唯一执行依据 | 建立项目时按此结构写自己的 TODO |
| `PRD-TEMPLATE.md` | PRD 文档模板——元信息 / 背景目标 / 需求范围 / 技术方案 / 接口 / 验收标准 / 测试计划 / 里程碑 / 风险 / 变更记录 | 每个 TODO 阶段开工前从模板复制 |
| `PRD-A1-cli-config.md` | **真实 PRD 样例**（rondo A1 阶段，已验收）——展示一份定稿 PRD 长什么样，含已勾选的 FR/AC 与变更记录 | 写 PRD 时对照参考 |

## 最小落地组合

- 单人 + AI agent 项目：`AGENTS.md` + `PROCESS.md` + `PRD-TEMPLATE.md`
- 需要阶段推进：再加 `TODO.yaml`
- 需要参考真实 PRD：看 `PRD-A1-cli-config.md`

## 注意

- `AGENTS.md` 里引用了 rondo 专属内容（`docs/TODO.yaml`、`.githooks/` 等），复制到新项目时按需裁剪
- Git Flow 部分（分支模型 / commit hook 强制）依赖 `.githooks/` 目录，需一并复制或按项目规模简化
