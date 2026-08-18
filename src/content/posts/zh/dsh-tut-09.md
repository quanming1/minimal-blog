---
title: DeepSeek Harness 声明依赖
date: '2026-08-18'
description: DeepSeek Harness 声明依赖——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-inject.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 声明依赖：inject 与内置服务
之前我们以及学会了独立运行的插件，但多数插件要用别人的能力：工具注册表、LLM、Agent。
本章节我们将介绍如何声明依赖，以及框架如何保证依赖就绪后才执行 apply。
## 什么是服务
服务是一个插件向其他插件公开的命名能力。
在 Harness 中，tools、llm、agents 都是服务，它们挂载在 ctx 上：ctx.tools、ctx.llm、ctx.agents。
| 内置服务 | 是什么 | 典型用法 |
| --- | --- | --- |
| **ctx.tools** | 工具运行时（ToolRuntime） | 注册 / 调用工具 |
| **ctx.llm** | 大语言模型服务（LLM） | 注册适配器、发起模型请求 |
| **ctx.agents** | 智能体服务（Agent） | 管理子智能体 |
## 用 inject 声明依赖
如果你的插件需要某个服务，就把它写进 inject 数组。
框架会确保这些服务就绪后，才加载你的插件。
## 实例
```
// 文件路径：scratch-plugin/src/my-tool-plugin.ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'my-tool-plugin'
// 声明依赖：需要 tools 服务
export const inject = ['tools']

export function apply(ctx: Context) {
  // 走到这里时，ctx.tools 一定已就绪
  ctx.tools.register(/* ... */)
}
```
apply 执行时，inject 声明的服务已经全部就绪。
这是框架的保证，不需要你在代码里做任何等待。
## 依赖未就绪：插件等待
如果某个服务还没准备好，插件不会执行。
它的 Fiber 会停在 PENDING 状态，等服务出现。
在生命周期里，PENDING 表示"已声明，但所需依赖未就绪"。
![](/minimal-blog/assets/dsh-tut/09-inject-ready.svg)
如果服务一直不来，插件就一直等，不会出错，也不会执行 apply。
## 必需依赖与可选依赖
inject 声明的是必需依赖：服务缺席时插件不加载。
如果某个服务可用可不用，用可选依赖：不写 inject，在使用处用 ctx.get() 查询。
## 实例
```
// 可选依赖：省略 inject，用 ctx.get() 查询
import type { Context } from '@deepseek-ai/cordis'

export function apply(ctx: Context) {
  // metrics 服务可能在也可能不在
  const metrics = ctx.get('metrics')
  // 可选链：不存在就跳过，不报错
  metrics?.record('plugin_loaded', 1)
}
```
## 服务消失时会发生什么
如果运行期间必需服务消失（比如提供方被卸载），会发生两件事。
第一，依赖它的插件会自动 dispose（释放资源）。
第二，当服务重新出现时，插件自动重新加载。
这防止插件调用一个已不存在的服务。
提示：这条规则与自动清理配合——卸载会触发第 8 篇讲的 disposer。
## 小结与自测
用 inject 声明必需服务，框架保证服务就绪后才执行 apply；可选服务用 ctx.get() 查询。
1. inject 数组声明的是什么？
2. 服务未就绪时，插件处于什么状态？
3. 可选依赖应该怎么声明？
