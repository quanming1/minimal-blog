---
title: DeepSeek Harness Python
date: '2026-08-18'
description: DeepSeek Harness Python——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-python-sdk.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness Python SDK 调用
Web UI 适合人盯着看，但你要在程序里调用 dsh 时，需要的是 SDK。
本章节介绍 Python SDK：怎么装、怎么跑仓库内置示例、怎么在自己的程序里调用。
## Python SDK 解决什么问题
SDK 把 dsh 变成你程序里的一行调用，而不是浏览器里的一个页面。
**DeepSeekHarness** 是 Python SDK 的核心类，用上下文管理器管理运行时的生命周期。
进入 with 块时延迟启动内置运行时，退出时自动释放，中间可反复调用 run。
适合的场景：批处理任务、把 dsh 集成进自己的产品、在测试里驱动 Agent。
SDK 装好之后，运行时不需要系统提供 Node.js，Python 进程自己带着一份。
## 前置要求
SDK 对系统有明确要求，先对照确认。
| 依赖 | 要求 |
| --- | --- |
| Python | 3.10 或更高版本 |
| Git | 已安装 |
| 操作系统 | Linux x64、Linux arm64，或 macOS 14+ 的 arm64 |
| API 端点 | DeepSeek 兼容的 API 端点与凭据 |
| 工作区 | agent 可以修改的隔离 workspace |
## 安装 SDK
克隆仓库拿到可运行示例，建虚拟环境，再安装 SDK 与同版本内置运行时。
```

$ git clone https://github.com/deepseek-ai/deepseek-harness.git
$ cd deepseek-harness
$ python -m venv .venv
$ . .venv/bin/activate
$ python -m pip install deepseek-harness-sdk
```
虚拟环境让 SDK 与系统其它 Python 包隔离，是官方推荐的姿势。
安装后的运行时不需要系统提供 Node.js。
## 运行仓库内置示例
仓库里带了一个 minimal.py 示例，跑通它等于验证整条 SDK 链路。
先在环境中设置凭据。
```

$ export DEEPSEEK_API_KEY=sk-your-key-here
# export DEEPSEEK_BASE_URL=http://127.0.0.1:8000/v1
# export DSH_MODEL=deepseek-v4-flash
# export DSH_SYSTEM_PROMPT='You are a helpful software engineer assistant.'
```
如果模型不是由默认 DeepSeek 端点提供，而是通过 OpenAI 兼容代理提供，还需要设置 DEEPSEEK_BASE_URL。
随后针对隔离的 workspace 和会话目录运行一个任务。
```

$ python examples/jsonrpc-agent/minimal.py \
  --workspace /absolute/path/to/workspace \
  --session-root /absolute/path/to/sessions \
  --session-id example-001 \
  "Inspect the repository and fix the failing tests."
```
脚本会打印 assistant 的最终回复。
会话目录会收到 JSONL 日志，其中包含组装后的模型请求与工具调用。
## 在自己的程序中使用 SDK
仓库内置示例其实是下面这段 SDK 调用的轻量包装，核心只有两步。
## 实例
```
# 文件路径：examples/jsonrpc-agent/minimal.py 的等价写法
from pathlib import Path

from deepseek_harness import DeepSeekHarness

# 示例组合配置文件的绝对路径（.cordis.yml 描述启动哪些插件）
config = Path("examples/jsonrpc-agent/minimal.cordis.yml").resolve()

# agent 可访问的 workspace，必须是绝对路径
workspace = Path("/absolute/path/to/workspace").resolve()

# 会话日志与状态的保存目录，必须是绝对路径
sessions = Path("/absolute/path/to/sessions").resolve()

# 上下文管理器：进入时延迟启动内置运行时，退出时自动释放
with DeepSeekHarness(
    provider="deepseek-official",   # 使用 DeepSeek 官方提供方
    model="deepseek-v4-flash",      # 模型名，SDK 默认也是它
    max_tokens=49_152,              # 单次回复的最大 token 数
    cwd=str(workspace),             # 把 workspace 设为 agent 的工作目录
    session_root=str(sessions),     # 会话日志写到哪里
    cordis=str(config),             # 用哪个组合配置启动
) as harness:
    # 发送一个任务；session_id 用于标识这段持久化对话
    result = harness.run(
        "Inspect the runoob-demo repository and fix the failing tests.",
        session_id="example-001",
    )

# 打印 assistant 的最终回复
print(result.final_response)
```
DeepSeekHarness 会延迟启动内置运行时，并持续复用，直至退出上下文管理器。
同一个 harness 可以在 with 块里多次调用 run，运行时就启动一次。
## 复用 session id：保留 Bash 进程
这是 SDK 最容易被忽略、也最有用的一条规则。
复用同一个 harness 与 session id，会保留该会话拥有的 Bash 进程。
包括它的工作目录、已导出的变量与 shell 函数，全都延续到下一次调用。
## 实例
```
# 第一次调用：在 runoob-workspace 里导出一个变量
result = harness.run(
    "Run `cd /repo && export RUNOOB_MODE=dev` and confirm.",
    session_id="runoob-session",
)
print(result.final_response)

# 第二次调用：复用同一个 session id，那个导出的变量还在
result = harness.run(
    "Print the value of RUNOOB_MODE.",
    session_id="runoob-session",
)
print(result.final_response)
```
独立任务应使用新的 session id；只有下一次调用需要延续同一段持久化对话时，才复用原有 id。
## 示例组合一览
minimal.py 背后的示例组合是一份刻意精简的配置，逐项看清它做了什么。
| 属性 | 值 |
| --- | --- |
| 系统提示词 | DSH_SYSTEM_PROMPT；未设置时使用 You are a helpful software engineer assistant. |
| minimal.py 使用的模型 | --model，其次为 DSH_MODEL，最后为 deepseek-v4-flash |
| 面向模型的工具 | 仅持久 bash 与 str_replace_editor |
| Bash 超时 | 300 秒 |
| 编辑器输出上限 | 16,000 个字符 |
| 上下文压缩 | 已关闭 |
| 文件系统 | 裸本地后端；编辑器使用绝对路径，可以访问运行时进程可见的任何路径 |
| 会话持久化 | DSH_SESSION_ROOT 下未压缩的 JSONL |
该组合省略了 harness 身份、workspace 提示词文本、skill、一次性 Bash、任务工具、上下文压缩等插件。
整体调用流程如下。
![](/minimal-blog/assets/dsh-tut/05-sdk-flow.svg)
## danger-full-access 的边界
这个示例组合使用 danger-full-access 权限预设，必须清楚它的边界。
danger-full-access 只能在可丢弃的 checkout 或容器内运行。
Bash 与编辑器可以修改运行时进程有权访问的任何路径，没有沙箱兜底。
持久 PTY 后端需要 POSIX 终端环境，因此该组合不支持 Windows agent。
换句话说，拿它跑真实项目之前，先确认这个环境弄坏了也不心疼。
## 小结自测
一句话总结：Python SDK 用 DeepSeekHarness 上下文管理器包住运行时，用 run(prompt, session_id) 发任务。
用三个小问题检验理解。
- 复用同一个 session id 会保留什么？
- 什么情况下应该使用新的 session id？
- minimal.py 默认给模型开放了哪些工具？

参考答案：会保留该会话的 Bash 进程，包括工作目录、已导出变量与 shell 函数。
独立任务用新 id；只有需要延续同一段持久化对话时才复用。
仅持久 bash 与 str_replace_editor 两个工具。
