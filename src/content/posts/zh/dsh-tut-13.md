---
title: DeepSeek Harness 依赖驱动
date: '2026-08-18'
description: DeepSeek Harness 依赖驱动——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-nested-reload.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 依赖驱动加载、自动重载与嵌套上下文
前面我们已经知道了了 Fiber 状态机，这一篇看状态机是如何被服务依赖驱动的。
为什么依赖的服务消失，插件会自动卸载？服务恢复后，又为什么能自动重载？
## 依赖驱动加载
声明了 inject 的插件会等待所有必需服务就绪，才会进入 LOADING 执行 apply。
这一机制用服务依赖表达加载顺序，而不需要手动编排启动顺序。
## 实例
```
// 文件路径：scratch-plugin/src/my-plugin.ts
// 声明本插件依赖 tools 与 llm 两个服务
export const inject = ['tools', 'llm']

export function apply(ctx: Context) {
  // 到这里 ctx.tools 与 ctx.llm 已经就绪，可以安全使用
}
```
如果依赖的服务消失（例如提供方被替换时），插件会被自动卸载，从 ACTIVE 直接走向 DISPOSED。
当服务恢复后，插件会被重新加载，重新走一遍 PENDING &rarr; LOADING &rarr; ACTIVE。
![](https://www.runoob.com/wp-content/uploads/2026/08/13-unload-reload.svg)
官方文档的原话：如果依赖的服务消失（例如提供方被替换时），插件会被自动卸载（ACTIVE &rarr; DISPOSED），待服务恢复后重新加载。
## 自动重载的保障
自动重载之所以安全，是因为通过 ctx 做的所有注册都会在卸载时被撤销。
旧实例的监听器、工具、适配器不会残留，新实例会重新注册。
这防止了插件调用已不存在的服务，也防止了重复监听或重复注册。
## 嵌套上下文：ctx.plugin()
ctx.plugin() 用来在当前插件内部注册一个子插件。
子插件创建子 Fiber，它继承父上下文，但有独立的生命周期。
子 Fiber 会随父插件一起卸载。
## 实例
```
// 文件路径：scratch-plugin/src/parent-plugin.ts
export function apply(ctx: Context) {
  // 注册一个子插件，childPlugin 可以是函数、对象或 Service 子类
  ctx.plugin(childPlugin)

  // 子插件拥有自己的 Fiber，随父插件一起卸载
}
```
嵌套上下文在插件组合里很常见：一个「聚合」插件把多个小插件组织到一起，统一管理它们的生命周期。
## 手动提前终止：fiber.dispose()
大多数情况下插件随上下文销毁而卸载，但有时你需要在运行中途提前终止一个插件实例。
ctx.plugin() 返回的 Fiber 对象提供 dispose() 方法。
## 实例
```
// 文件路径：scratch-plugin/src/manual-dispose.ts
import type { Context } from '@deepseek-ai/cordis'

// 类型声明：context 与插件函数（示意）
declare const ctx: Context
declare function myPlugin(ctx: Context): void

// 创建插件实例，拿到它的 Fiber
const fiber = ctx.plugin(myPlugin)

// 之后需要手动终止时调用 dispose
// 注意：dispose 返回 Promise，需要 await 等待异步清理完成
await fiber.dispose()
```
dispose 保证三件事：
| 保证 | 说明 |
| --- | --- |
| 所有注册被移除 | 该插件拥有的监听、工具、适配器等注册全部撤销 |
| 子插件递归卸载 | 通过 ctx.plugin() 创建的子 Fiber 也会被一并清理 |
| 等待异步清理完成 | 返回的 Promise 在所有异步处置器结束后才兑现 |
换句话说，await fiber.dispose() 返回时，这个插件连同它的子树都完全停稳了。
## 小结自测
依赖驱动加载让插件只在服务就绪时启动，服务消失自动卸载、恢复自动重载；ctx.plugin() 创建可递归卸载的子 Fiber。
自测一下：
- inject 声明的服务没就绪时，插件停在哪个状态？
- ctx.plugin() 创建的子 Fiber 与父 Fiber 是什么关系？
- await fiber.dispose() 返回时，能保证哪些事情已经完成？
