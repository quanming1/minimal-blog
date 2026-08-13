# minimal-blog 项目推进管理办法（PRD 驱动开发）

> 本文件定义本博客的开发推进机制：**先 PRD，后开发**。任何阶段没有定稿的 PRD 不开工。
> PRD 是开发的唯一依据，验收以 PRD 的「验收标准」为准。
> 本方法源自 rondo 项目实战沉淀（Rondo 方法，见 assets/rondo-method/ 与《Rondo 方法》一文），按本仓库规模裁剪。

---

## 1. 核心原则

1. **先 PRD，后开发**：每个 TODO 阶段开工前，必须先有对应 PRD 文档并定稿（状态 `approved`）。
2. **一阶段一 PRD**：每个 TODO 阶段（A1 / B3 / E1 ...）对应一份 PRD 文档，位于 `docs/prd/`。
3. **PRD 即契约**：实现、测试、验收全部对照 PRD 执行；开发过程中不擅自扩大或缩小范围。
4. **验收不通过 = 未完成**：PRD 验收标准逐条核对，全部通过才更新 TODO / CHANGELOG / 进入下一阶段。

## 2. 开发流程（六步闭环）

```
立项 → 评审 → 开发 → 验证 → 收尾 → 发布（可选）
```

| 步骤 | 动作 | 产物 / 状态 |
|---|---|---|
| 1. 立项 | 从 `docs/TODO.yaml` 选定一个阶段，撰写 PRD | `docs/prd/PRD-<阶段>-<名称>.md`（状态：草稿） |
| 2. 评审 | 逐条核对需求与验收标准，定稿 | PRD 状态：`approved`（定稿后冻结，变更需说明） |
| 3. 开发 | 按 PRD 需求实现 | 代码 + 测试；PRD 状态：开发中 |
| 4. 验证 | 对照 PRD「验收标准」逐条执行（lint / test / build / 手动） | 全部通过 → 进入收尾；失败 → 回开发 |
| 5. 收尾 | 更新 CHANGELOG、TODO 状态 `done`、PRD 状态 `已验收` | 提交并推送（main） |
| 6. 发布（可选） | 版本号 + 发布提交 | `feat(release): vX.Y.Z - 摘要` |

## 3. PRD 文档规范

- **位置**：`docs/prd/`
- **命名**：`PRD-<阶段>-<名称>.md`，名称与 TODO 阶段一致，如 `PRD-E1-performance.md`
- **模板**：`assets/rondo-method/PRD-TEMPLATE.md`（新阶段一律从模板复制；真实样例 `assets/rondo-method/PRD-A1-cli-config.md`）
- **生命周期**：
  ```
  草稿 → 评审 → approved（定稿） → 开发中 → 已验收
  ```
- **变更纪律（需求变更双路径）**：`approved` 之后收到新需求，**先判断路径再动手**：

  | 判断维度 | 路径 A：新开 PRD | 路径 B：修改原 PRD |
  |---|---|---|
  | 阶段 | 新 TODO 阶段 / 跨阶段 | 同一阶段内 |
  | 主题 | 全新方向 | 同主题增量/细化 |
  | 范围 | 超出原 PRD 边界 | 原 FR/AC 的修正补充 |
  | 原 PRD 状态 | 已验收且新需求是另一件事 | 任意状态（含已验收后的小调整） |

  - **路径 A（新开）**：TODO.yaml 选定/新增阶段（标 `in_progress`）→ 复制模板 → `docs/prd/PRD-<阶段>-<名称>.md` → 走完整闭环
  - **路径 B（修改原 PRD）**：修改正文（对应 FR/AC/技术方案）→ **MUST 在 PRD 末尾「变更记录」追加一行（日期 + 变更内容 + 理由）** → MUST 重新核对受影响 AC（不通过则回到开发中）

## 4. 状态联动

| 文档 | 状态来源 | 更新时机 |
|---|---|---|
| `docs/TODO.yaml` | 阶段状态（未开始 / 中 / 通过） | 立项时 `in_progress`；验收通过后 `done` |
| `docs/prd/PRD-*.md` | PRD 生命周期状态 | 各步骤推进时更新 |
| `CHANGELOG.md` | 版本变更记录（工程层面） | 每阶段收尾追加 |
| `docs/prd/PRD-*.md` 的「变更记录」 | 重大架构决策 | 决策发生时 |

## 5. 验收纪律

- 验收标准必须**可执行**：命令、断言、可勾选清单（禁止「看起来不错」这类模糊标准）。
- 验收三步：`bun run lint`（类型检查）+ `bun test --parallel=1`（测试）+ `bun run build`（构建）+ PRD 手动验收项。
- 未达标准不标记完成；反复失败要回到初始假设重新判断（AGENTS.md 工作方式 §6）。

## 6. 与 Git 规范的配合

- 本仓库单 `main` 分支 + GitHub Pages 部署：无 develop/feature 分支模型（按规模裁剪，见 AGENTS.md 提交规范说明）。
- 提交信息：`<type>(<scope>): <subject>`（subject 中文，type/scope 白名单见 AGENTS.md）；提交信息里可附 TODO 阶段引用（如 `feat(components): xxx（E1）`）便于追溯。
- PRD 文档本身用 `docs(docs)` 或对应 scope 提交。
