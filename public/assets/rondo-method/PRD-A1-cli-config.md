# PRD-A1 CLI 骨架 + 配置系统 + 多 Provider 抽象

## 元信息

| 字段 | 值 |
|---|---|
| 阶段 | A1 |
| 名称 | CLI 骨架 + 配置系统 + 多 Provider 抽象 |
| 状态 | **已验收**（2026-08-12 全 AC 通过） |
| 创建日期 | 2026-08-12 |
| 定稿日期 | 2026-08-12 |
| 验收日期 | 2026-08-12 |
| 关联文档 | docs/ROADMAP.md §Step 1；docs/TODO.yaml A1；docs/FEASIBILITY.md §3.1 |

## 1. 背景与目标

- **背景**：rondo 处于地基阶段。comanda 的历史教训第一条就是「v0.0.1 一上来就 5 个 provider」——Provider 抽象必须从第一天建立，不能先写死一家再重构。
- **目标**：本阶段完成 `rondo` 的 CLI 骨架、`~/.rondo/config.yaml` 配置系统、Provider 抽象与 OpenAI 兼容实现，`rondo configure` 可写入配置，且至少能通过 2 个不同 base_url 的 provider 各发一条消息。
- **非目标**：DSL 解析与 step 管道（A2）；agentic loop（C1）；不实现 process 的真实执行（仅保留命令占位）。

## 2. 需求范围

### 2.1 功能需求

- [x] FR1：click CLI 根命令组 + `--version` 输出（已完成：`rondo --version` → `rondo, version 0.0.1`）
- [x] FR2：`hello` 演示命令（已完成：输出 Hello world）
- [x] FR3：配置系统 `rondo/config/`——`~/.rondo/config.yaml` 的加载与保存（文件不存在返回空配置、自动建目录、权限 0600）
- [x] FR4：Provider 抽象 `rondo/models/`——接口 `name / supports_model / configure / send_prompt`
- [x] FR5：OpenAI 兼容实现 `rondo/models/openai.py`——支持自定义 base_url（OpenAI / DeepSeek / MiniMax / 网关）
- [x] FR6：`rondo configure` 命令——`--provider --api-key [--base-url] [--models] [--default-model]` 写入配置并回显
- [x] FR7：opencode CLI agent 后端 `rondo/models/opencode.py`——`opencode run` 驱动（`-m <provider/model>` 剥 `opencode/` 前缀 / `--dir` / `--dangerously-skip-permissions` / `--format json`），流式事件聚合为最终文本；`detect_provider` 按 `opencode/` 前缀路由；`-s` 可选会话续跑（C1 agentic loop 接入）

### 2.2 非功能需求

- 配置读写幂等；文件不存在不报错（返回空配置）
- 类型注解完整（AGENTS.md §3）
- 测试不依赖真实 API key（用 mock provider）

## 3. 技术方案

```
rondo/
├── cli.py              # click 命令组（root / configure / process 占位 / hello）
└── config/
    └── __init__.py     # dataclass：ProviderConfig / Config；load / save / get_provider / set_provider
    └── (env.py 后续按需拆分)
└── models/
    ├── __init__.py     # Provider 协议（typing.Protocol 或 ABC）
    └── openai.py       # OpenAIProvider：httpx 直连 chat/completions（不引入 openai SDK，减依赖）
```

- **配置结构**（对齐 comanda `utils/config/env.go`）：
  ```python
  @dataclass
  class ProviderConfig:
      api_key: str
      base_url: str = ""
      models: list[str] = field(default_factory=list)

  @dataclass
  class Config:
      default_model: str = ""
      providers: dict[str, ProviderConfig] = field(default_factory=dict)
  ```
- **依赖**：click（已声明）；httpx 需新增声明到 pyproject.toml（理由：比 openai SDK 轻，直接调 OpenAI 兼容端点，AGENTS.md §2.4）

## 4. 接口定义

### 4.1 CLI

```bash
rondo configure --provider <name> --api-key <key> \
    [--base-url <url>] [--models <m1> <m2>...] [--default-model <m>]
# 输出：Configuration saved to <path> + 回显 provider/models/default_model
```

### 4.2 配置 YAML（~/.rondo/config.yaml）

```yaml
default_model: "DeepSeek V4 Flash"
providers:
  zen:
    api_key: "sk-xxx"
    base_url: "https://opencode.ai/zen/go/v1"
    models:
      - "DeepSeek V4 Flash"
      - "MiniMax M3"
```

### 4.3 Provider 协议

```python
class Provider(Protocol):
    name: str
    def supports_model(self, model: str) -> bool: ...
    def configure(self, cfg: ProviderConfig) -> None: ...
    def send_prompt(self, model: str, prompt: str) -> str: ...
```

## 5. 验收标准

- [x] AC1：`rondo --version` 输出 `rondo, version 0.0.1`（实测通过）
- [x] AC2：`rondo configure --provider zen --api-key sk-test --base-url https://opencode.ai/zen/go/v1 --models "DeepSeek V4 Flash" --default-model "DeepSeek V4 Flash"` 生成 `~/.rondo/config.yaml`，内容与 §4.2 结构一致（实测通过）
- [x] AC3：重复执行 configure（覆盖写）不报错、不产生重复项（pytest 覆盖）
- [x] AC4：`load()` 对不存在的文件返回空配置而非报错（pytest 覆盖）
- [x] AC5：2 个不同 base_url 的 provider 各自 `send_prompt` 返回非空回复（mock 双 provider URL 断言 + 真实 zen 网关回复「我是DeepSeek…」）
- [x] AC6：`pytest tests/` 全部通过（20 passed）
- [x] AC7：`ruff check .` 无警告（All checks passed）

## 6. 测试计划

- `tests/test_config.py`：load 空文件 / save 写盘 / set-get provider / 覆盖写
- `tests/test_cli.py`：`configure` 命令写配置 + 回显（CliRunner）
- `tests/test_models.py`：OpenAIProvider 用 mock httpx（responses 或 monkeypatch）验证请求 URL / headers / 响应解析；supports_model 大小写不敏感
- 手动：真实 key 发一条消息验证端到端

## 7. 里程碑与估算

| 子任务 | 预估 |
|---|---|
| config 模块（dataclass + load/save） | 0.5 天 |
| models Provider 协议 + OpenAI 实现 | 0.5 天 |
| configure 命令 + 回显 | 0.5 天 |
| 测试 + ruff + 手动验证 | 0.5 天 |

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| httpx 引入未声明依赖 | 先更新 pyproject.toml 再开发（AGENTS.md §2.4） |
| 网关（opencode.ai）响应格式差异 | 只依赖 OpenAI 兼容的 chat/completions 最小字段；错误信息透传 |
| Windows 路径（~ 展开） | 用 `Path.home()` 而非硬编码 |

## 9. 变更记录

| 日期 | 变更内容 | 理由 |
|---|---|---|
| 2026-08-12 | 初始定稿 | — |
| 2026-08-12 | models 列表支持 name→target 映射（`ModelSpec`：name 显示名 / target 网关 ID，空则用 name） | 实测 opencode.ai 网关只识别 target（如 `deepseek-v4-flash`），不识别显示名（"DeepSeek V4 Flash"）；comanda 同此设计（配置中 name/target 分离） |
| 2026-08-13 | 新增 FR7：opencode CLI agent 后端（`OpenCodeProvider`） | 用户新增第二 CLI agent 后端需求：opencode 模型无关（可接任意 OpenAI 兼容模型，如 zen 网关 deepseek-v4-flash），会话可见可续（`session list` / `-s`，优于 claude -p 的 queue-operation 不可见）；输出为流式 JSON 事件（每行一个，与 claude 单 envelope 不同），prompt 走命令行位置参数（长 prompt 受 ARG_MAX 限制） |
