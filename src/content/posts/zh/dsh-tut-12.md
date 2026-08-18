---
title: DeepSeek Harness 插件生命周期
date: '2026-08-18'
description: DeepSeek Harness 插件生命周期——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-lifecycle.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 插件生命周期：Fiber 状态机
之前章节我们已经注册过监听器、注册过工具、也写过 ctx.effect()。
你有没有想过：一个插件究竟从什么时刻开始「运行」，又在什么时刻开始「卸载」？
本章节介绍 Cordis 插件模型与生命周期状态机，也就是 Fiber 状态机。
## Fiber 是什么
每个被加载的插件都拥有一个 Fiber 作用域。
Fiber 可以理解成插件实例的执行单元，它承载插件从声明、加载、运行到卸载的全部状态。
框架通过 Fiber 知道一个插件现在处于什么阶段，以及接下来可以做什么。
**Fiber**：一个插件实例在 Cordis 运行时中的状态容器。
它记录该插件的生命周期状态，也是卸载时清理注册的依据。
## Fiber 状态机
Fiber 的状态按下面的顺序迁移，描述一个插件从加载到卸载的完整一生。
![](https://www.runoob.com/wp-content/uploads/2026/08/12-fiber-state.svg)
主路径是 PENDING &rarr; LOADING &rarr; ACTIVE &rarr; UNLOADING &rarr; DISPOSED。
在 LOADING 阶段如果 apply 抛出异常，则进入 FAILED。
| 状态 | 含义 | 发生时机 |
| --- | --- | --- |
| **PENDING** | 已声明，但所需依赖未就绪 | 插件被加入上下文，inject 的服务还没准备好 |
| **LOADING** | 依赖就绪，正在执行 apply | 所有必需服务就绪，框架调用 apply(ctx) |
| **ACTIVE** | 插件运行中 | apply 正常返回，注册生效 |
| **FAILED** | apply 抛出异常 | apply 执行过程中抛错，加载失败 |
| **UNLOADING** | 插件正在卸载并释放资源 | 依赖消失、被 dispose、或 HMR 触发卸载 |
| **DISPOSED** | 已完全卸载 | 所有处置器执行完毕 |
术语：inject 是插件声明所需服务依赖的字段，框架会等这些服务全部就绪后才执行 apply。
## 依赖驱动的加载
声明了 inject 的插件，会等待所有必需服务就绪后再进入 LOADING。
如果依赖的服务一直没出现，插件就停留在 PENDING，不会执行 apply。
## 实例
```
// 文件路径：scratch-plugin/src/my-plugin.ts
// 声明本插件需要 tools 与 llm 两个服务，二者就绪前 apply 不会执行
export const inject = ['tools', 'llm']

export function apply(ctx: Context) {
  // 走到这里时，ctx.tools 和 ctx.llm 一定已经就绪
  // 可以放心地注册工具、读取模型配置
}
```
这是 Cordis 用服务依赖来表达加载顺序的方式，而不是手动编排启动序列。
## 自动清理机制
通过 ctx 做的任何注册，在插件卸载时都会自动撤销。
这是 dsh 能「自己清理」的根本原因，也是热替换能安全生效的前提。
| 注册操作 | 卸载时的清理 |
| --- | --- |
| ctx.on(event, handler) | 事件监听自动移除 |
| ctx.tools.register(tool) | 工具注册自动移除 |
| ctx.llm.registerAdapter(names, adapter) | LLM 适配器注册自动移除 |
| ctx.effect(() =&gt; cleanup) | 返回的处置器在卸载时执行 |
其中 ctx.effect 用来管理没有现成「注册表」可追踪的自定义资源，比如网络连接。
## 处置器的调用顺序
插件卸载时，处置器按注册顺序的逆序开始调用。
多个异步处置器会并发执行，不保证逐个完成。
存在顺序依赖的清理步骤，必须放进同一个 ctx.effect() 返回的处置器里，由该处置器负责串行等待。
例如你先后注册了 A、B 两个效果，卸载时会先调用 B 的处置器，再调用 A 的处置器。
如果 B 的清理必须等 A 的清理完成，就要把这两步写进同一个 effect。
## 动手示例：观察状态迁移
官方文档用下面这个最小插件演示加载与卸载的日志。
## 实例
```
// 文件路径：scratch-plugin/src/lifecycle-log.ts
// 用 console.log 打印生命周期事件，观察 apply 与 effect 的先后
export function apply(ctx: Context) {
  // apply 被调用：插件从 LOADING 进入 ACTIVE
  console.log('runoob plugin loading')

  // 注册一个效果：返回的清理函数在卸载时执行
  ctx.effect(() => {
    // 效果注册完成（apply 仍在执行中）
    console.log('runoob effect registered')
    // 返回 disposer：插件卸载时调用
    return () => console.log('runoob effect cleaned up')
  })
}
```
加载时输出：
```

runoob plugin loading
runoob effect registered
```
卸载时输出：
```

runoob effect cleaned up
```
可以看到 apply 先执行，随后执行到 effect 注册，返回的处置器在卸载阶段被调用。
## 小结自测
Fiber 状态机描述了插件从声明到完全卸载的六个状态，处置器按注册逆序、异步并发地清理注册。
自测一下：
- Fiber 有哪六个状态？apply 抛异常时进入哪个状态？
- 为什么 ctx.on 注册的监听器不需要手动 removeListener？
- 两个存在顺序依赖的清理步骤，应该怎么写才安全？
