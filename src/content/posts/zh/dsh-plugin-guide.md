---
title: dsh 插件开发流程：从零到跑通的全指南
date: '2026-08-18'
description: 八步流程、15 个坑、三个文档没写的硬契约、静默挂死排查手册——写给第一次写 dsh 插件的人
tags: [dsh, 插件开发, DeepSeek, 踩坑]
---
> 本文是[上一篇《写一个 dsh 插件只要 20 分钟，跑起来花了 6 小时》](/minimal-blog/posts/dsh-plugin-six-hours/)的完整手册版：那篇讲故事，这篇给你能照着抄的全流程。

## 0. 先建立三个认知

### 认知一：dsh 插件是什么

dsh（DeepSeek Harness）是一个 Agent 运行器，它的所有功能——LLM 对接、工具执行、会话管理——**全是插件**。官方包（`dsh-base`）是一堆插件的集合，你写的插件和官方插件地位完全平等：同一个入口函数、同一套事件系统。

所以"开发 dsh 插件"不是给别人的软件打补丁，而是**用官方留的钩子扩展一个插件体系**——和写 VS Code 插件、Obsidian 插件是同一种事。

### 认知二：插件的全部契约就一个函数

```js
export function apply(ctx, config) {
  // 你的插件代码
}
```

- `ctx`：运行时上下文（cordis 给的"工具箱"）——订阅事件、读服务、注册生命周期都靠它
- `config`：用户配置，从 profile 的 `cordis.patch.yml` 透传进来
- dsh 启动时对**每个插件**调用一次 apply

### 认知三：插件不能单独跑，profile 才是运行单位

你的插件代码必须被装进一个 **profile**（`~/.dsh/profiles/xxx/`）。profile 是"一套插件组合 + 一份配置"，dsh 命令行启动的是 profile，不是插件。

## 1. 整体流程（八步）

```
①想清楚要什么 → ②搭项目骨架 → ③写纯函数逻辑 → ④写 apply 接线
→ ⑤单测 → ⑥建 profile 挂载 → ⑦装依赖+试跑 → ⑧实测验证
```

⑥⑦ 是新手最容易翻车的地方（15 个坑全在这），别跳步。

## 2. 选扩展点

| 我想…… | 用什么扩展点 |
|---|---|
| 改每次发给模型的请求（档位、参数） | `agent/request` waterfall |
| 监听会话事件（回答/思考/工具调用）做统计、审计 | `session/event` |
| 挂外部工具（MCP server） | mcp-client 插件配置 |
| 让 dsh 被 SDK 遥控（stdio JSON-RPC） | octo-sdk-server 这类 server 插件 |
| 注册设置页可改的选项 | `settings` 服务 |

## 3. 项目骨架与设计纪律

```text
my-plugin/
├── package.json       # name/type:module/main
├── src/
│   ├── logic.mjs      # 纯函数：核心逻辑（零 dsh 依赖！）
│   └── index.mjs      # apply(ctx, config)：只做接线
└── test/
    └── logic.test.mjs # node:test 单测（不需要起 dsh）
```

**最重要的纪律：逻辑和接线分离。** 纯函数不知道 dsh 存在 → 测试毫秒级零依赖全分支覆盖；apply 只做"找事件源、调纯函数、写结果"。逻辑错了单测抓，接线错了实测抓。

## 4. 三个文档没写的硬契约（违反即静默挂死）

### 契约一：insert 带 config 的插件，必须声明 Config Schema

```js
import Schema from "@deepseek-ai/schemastery";

export const Config = Schema.object({
  outputFile: Schema.string().description("统计落盘路径"),
  label: Schema.string().default(""),
});

export function apply(ctx, config) { ... }
```

不声明，整个 profile 启动**卡死且零报错**——现象和原因之间没有任何可追的线索。这是实测最贵的一个坑。

### 契约二：事件回调是 (session, event)，事件在第二个参数

```js
ctx.on("session/event", (session, event) => { /* event 才是事件本体 */ });
```

按单参数 `payload.event` 解析会永远得到 undefined——事件全丢且零报错（源码实证：`callbackArgs = [this, event]`）。

### 契约三：挂载有两条路，别混

| 路线 | 要求 |
|---|---|
| bundles（package.json 的 dsh.profile.bundles） | 插件包需声明 `"dsh": {"bundle": {"patch": "./cordis.patch.yml"}}` |
| profile patch 的 insert（依赖只进 dependencies） | 无 bundle 清单要求，config 走契约一的 Schema |

新手优先走 insert 路线。

## 5. profile 挂载与配置

```text
~/.dsh/profiles/my-lab/
├── package.json           # deps 加 file: 引用 + bundles 数组
├── cordis.patch.yml       # 顶层数组！- id / - insert 条目
├── cordis.yml             # 空数组 [] 即可
├── pnpm-workspace.yaml    # pnpm 11 需 allowBuilds: true 放行原生依赖
└── plugins/
    ├── octo-sdk-server/   # 复制完整包（package.json 必须在！）
    └── my-plugin/         # 你的插件副本
```

`cordis.patch.yml` 四段式模板：

```yaml
- id: llm-deepseek         # 强制官方端点
  config: { apiKeyEnv: DEEPSEEK_API_KEY, baseURL: https://api.deepseek.com }
- insert:                  # 挂你的插件
    - id: my-plugin
      name: my-plugin
      config: { outputFile: 'C:/dsh-stats/stats.jsonl' }
- id: user-questions       # 无人值守必需
  disabled: true
- id: hmr                  # 一次性会话不需要热重载
  disabled: true
```

安装流程定式（重要）：

```bash
chcp 65001                        # Windows 中文用户名必先切 UTF-8
dsh plugin --profile my-lab install   # 先装依赖
# 然后手工检查 package.json 的 bundles——install 可能把 bundles 剥到只剩 dsh-base
# 补回 bundles 后别再跑 install；后续刷新依赖用裸 pnpm install
```

## 6. 实测：SDK client 驱动器

别用 `type probe.jsonl | dsh`（喂完即 EOF，回合没跑完管道先断）。写个 10 行驱动器用官方 SDK client 全程握管道：

```js
import { DeepSeekHarness } from "@deepseek-ai/dsh-sdk-client";

const harness = new DeepSeekHarness({
  provider: "deepseek-official",
  model: "deepseek-v4-flash",
  cwd: process.env.TEMP,
  launch: { command: /* Windows: cmd.exe /c dsh.cmd 全路径 */, args: ["--profile", "my-lab"] },
});
await harness.start();
const { finalResponse } = await harness.run("请只回复两个字:收到", {
  sessionId: "probe-1",
  onNotification: () => {},
});
await harness.close();
```

实测通过的样子：`started 3.1s → turn 11.5s → final="收到"`，插件统计 `textChars=2`（"收到"正好两个字）与事件 dump 完全对账。

## 7. 坑总表（15 个，按出现顺序）

| # | 坑 | 解法 |
|---|---|---|
| ① | 中文用户名路径乱码 | 命令前 `chcp 65001` |
| ② | pnpm 11 拒跑构建脚本 → install "失败" | pnpm-workspace.yaml 写 `allowBuilds: 包名: true` |
| ③ | cordis.patch.yml 写成字典 | 顶层数组，`- id:` / `- insert:` 条目 |
| ④ | 插件里 console.log 污染 stdout | 输出一律 `appendFileSync` 落盘 |
| ⑤ | 探针漏 shutdown → 挂死超时 | initialize + prompt + shutdown 三件套 |
| ⑥ | npm 装进 pnpm profile | profile 内只许 pnpm 或 `dsh plugin install` |
| ⑦ | rc.1/rc.6 混用依赖链断 | 全链精确锁 `0.1.0-rc.6` |
| ⑧ | install 成功会剥 bundles | 先 install 再手工补 bundles，之后别再 install |
| ⑨ | file: 依赖进 store 是死副本 | 改插件源码后重跑 `pnpm install` 刷新 |
| ⑩ | robocopy /XF 全局排除误伤子目录 | 复制后对比目录完整性 |
| ⑪ | 中文路径进 YAML config 被搞坏 | config 路径纯 ASCII + 正斜杠 |
| ⑫ | 僵尸进程占全局锁 | 排查第一步永远是清进程 |
| ⑬ | Windows spawn：裸名 ENOENT / .cmd 又 EINVAL | `cmd.exe /c dsh.cmd全路径` 包装 |
| ⑭ | stdin 喂完 EOF 断管道 | 实测用 SDK client 驱动器 |
| ⑮ | 只喂 initialize 也挂（没 shutdown） | 最小探针两行：initialize + shutdown |

## 8. 静默挂死排查手册

症状：dsh 启动后无输出、永不退出。按序排查：

1. **清僵尸进程**（坑⑫）
2. **换已知好 profile 对照**——好 profile 也挂 = 环境坏；只有自己的挂 = profile 特有
3. **二分 patch.yml**——摘掉 insert 看通不通，逐段加回
4. **查插件包完整性**——node_modules 和 plugins 两处都要有 package.json（坑⑨⑩）
5. **查 bundles 与 deps 一致性**（坑⑧）
6. **加 config 才挂** → 缺 Config Schema（契约一）

## 9. 什么时候算做完

- 纯函数单测全绿（毫秒级）
- 探针跑通，dsh 正常退出（exit 0）
- 统计产物与事件 dump 对得上数
- dumpEvents 切 off 再跑，行为不变

## 残余风险

以上对 dsh `0.1.0-rc.6` 有效。rc 阶段契约随时会变（尤其事件名），换版本请重新实测，别拿本文当跨版本真相。通信原理层面的东西（stdio 管道、octo-sdk-server）见[《dsh 的通信地基》](/minimal-blog/posts/dsh-stdio-ipc/)。
