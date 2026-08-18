---
title: DeepSeek Harness 工具执行
date: '2026-08-18'
description: DeepSeek Harness 工具执行——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-tool-pipeline.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 工具执行流水线与权限门禁
前面几章节我们学会了用 defineTool 注册工具，也学会了用事件系统监听各种扩展点。
但现在有个疑问：模型发出一条工具调用之后，到工具真正执行、结果回到模型，中间到底走了哪些环节？
本章节我们将讲清楚 dsh 的「工具执行流水线」，以及如何用钩子插件实现权限门禁。
一句话：一次工具调用会按固定顺序经过多个环节，每个环节负责一类策略，钩子插件可以在其中允许、拒绝或询问。
## 流水线的整体顺序
工具执行不是「调用一下函数」那么简单，而是一条有固定顺序的流水线。
官方文档把顺序概括为：tools/pre-execute → 单调守卫 → tools/execute → tools/post-execute → finalizeContent → tools/result。
其中前三个 waterfall 可以改写一次调用，而由定义自身控制的 finalizeContent 与 tools/result 在其后运行。
![](/minimal-blog/assets/dsh-tut/24-tool-pipeline-fixed.svg)
先看两个容易混淆的概念：
waterfall（瀑布式事件）是一种事件分发模式，监听器可以调用 `next()` 把决定权委托下去，也可以直接返回一个决策短路。
单调守卫（monotonic guard）是一道只允许缩减、不允许撤销的最终防线。
下面逐个环节拆开讲。
## tools/pre-execute：可重排的策略层
`tools/pre-execute` 是流水线中第一个 waterfall，负责承载「钩子、权限、沙箱」这一类可重排的策略。
它之所以叫「可重排」，是因为监听器可以通过 `next()` 把决定权传给下一个监听器，多个策略插件的先后顺序可以在配置里调整。
这个 waterfall 返回一个类型化决策 PreToolDecision，有三种取值：
| 决策 | 含义 | 后续行为 |
| --- | --- | --- |
| `{ kind: 'allow' }` | 放行这次调用 | 继续走单调守卫与之后的环节 |
| `{ kind: 'deny'; reason: string }` | 拒绝这次调用 | 物化成一个错误结果，工具主体被跳过 |
| `{ kind: 'ask'; reason?: string }` | 询问用户 | 只有审批服务返回 `allowed-once` 才继续，否则拒绝 |
注意 `ask` 分支：它会触发 `ctx.approval` 的一次性询问，这一块留到下一篇展开。
参数不可被改写，因为历史记录、审计、UI 与执行必须保持一致。
**什么时候用 pre-execute？**
当策略需要「允许、拒绝或询问」三类动作之一，且希望策略之间可以自由排序时，用它。
沙箱、权限、plan-mode 等插件都用这个扩展点。
## 单调守卫：不可撤销的最终拒绝
waterfall 的缺点是：后注册的监听器可以推翻前面监听器的决策。
当某个不变式（invariant）需要「最终拒绝、且任何人都不能撤销」时，就要用 `ctx.tools.guard()`。
守卫的类型是 ToolGuard，它故意没有 allow 结果：返回字符串表示拒绝，返回 `undefined` 表示维持现状。
```

// ToolGuard：感知作用域的最终预分派策略
type ToolGuard = (execution: Readonly<ToolExecution>) => string | undefined
```
因为守卫没有 allow 结果，所以监听器的顺序永远无法把一次拒绝变回允许。
这就是「单调」的含义：只减不增，只收权限，不给权限。
实践原则：可重排的策略放 `tools/pre-execute`；必须「最终生效、不可撤销」的不变式放 `ctx.tools.guard()`。
## tools/execute 与 tools/post-execute
`tools/execute` 负责「环绕分派」，也就是把真正调用工具主体这件事包起来。
超时、重试、指标收集都在这一层做，它包装的是实际分发生命周期。
它拿到的视图是 ToolDispatchExecution：只有这一个视图可以替换必需的 `exec.signal`，用来施加截止时间。
替换规则是：可以替换，但不能移除，注册表会在调用工具主体前重新融合调用方的 signal。
`tools/post-execute` 负责在工具执行完、结果归一化之前做检查或改写，它返回 PostToolDecision：
| 决策 | 含义 |
| --- | --- |
| `{ kind: 'accept'; content? }` | 接受结果，可替换展示内容（保留规范值与元数据） |
| `{ kind: 'accept'; value }` | 接受结果，可替换规范值（会重新校验并重算内容） |
| `{ kind: 'block'; feedback }` | 阻止结果，把纠正反馈变成错误结果 |
内容替换是展示策略，不是保密策略。
要隐藏程序化值，必须替换该值或阻止结果。
## finalizeContent 与 tools/result
`finalizeContent` 是工具定义（ToolDefinition）自己拥有的回调，注册表恰好调用它一次。
它是「最后的仅内容不变式」：同步执行，只允许做内容层面的最后修正。
在这之后，注册表会物化并冻结已接受的结果，然后触发 `tools/result`。
`tools/result` 是同步通知，用来观测冻结的、不可变的权威结果。
观测者无法变换结果，观测者的失败也会被隔离，不会影响主流程。
需要「审计、指标、捕获最终结果」时用它；需要「变换结果或附加上下文」时才用 `tools/post-execute`。
选型记忆法：pre-execute 决定「能不能做」，execute 决定「怎么做」，post-execute 决定「结果怎么呈现」，result 只负责「看一眼最终结果」。
## 动手示例：写一个权限门禁插件
官方文档以「权限门禁」为例，展示钩子插件如何使用 `tools/pre-execute`。
钩子插件就是普通的 Cordis 插件，并不需要外部协议。
## 实例
```
// 文件路径：my-plugins/permission-gate/src/index.ts
// 一个基于 tools/pre-execute 的权限门禁插件。
// 它返回类型化的决策：命中黑名单就 deny，否则调用 next() 委托下去。
import type { Context } from '@deepseek-ai/cordis'
import type { PreToolDecision, ToolExecution } from '@deepseek-ai/dsh-tools'

// 黑名单：runoob 项目里禁止直接写文件系统的工具。
// 这里用最简单的集合演示；真实项目里可以查数据库、问审批服务。
const DENY_TOOLS = new Set(['fs_write', 'fs_edit'])

// 策略判定函数：返回这次调用是否被允许。
// exec 携带不可变的调用身份（callId、name、arguments、agent、token、signal）。
async function isAllowed(exec: ToolExecution): Promise<boolean> {
  if (DENY_TOOLS.has(exec.name)) return false
  // 额外示例：runoob 演示里禁止修改 .env 文件（参数在进入策略前已被冻结）。
  const raw = exec.arguments as { path?: string }
  if (typeof raw.path === 'string' && raw.path.includes('.env')) return false
  return true
}

export const name = 'permission-gate'

export function apply(ctx: Context) {
  // tools/pre-execute 是 waterfall：监听器可以返回决策，或调用 next() 委托。
  ctx.on('tools/pre-execute', async (exec, next): Promise<PreToolDecision> => {
    if (!(await isAllowed(exec))) {
      // 返回 deny 会立即终止这次调用，后续监听器不再执行。
      return { kind: 'deny', reason: 'Denied by policy: this tool is not allowed in the runoob workspace.' }
    }
    // 放行：把决定权交给流水线中后续的监听器。
    return next()
  })
}
```
这个插件加载后，模型每次调用工具都会先经过它。
命中黑名单的工具会得到一个带 reason 的错误结果，工具主体被跳过。
因为它返回的是类型化决策，其它策略插件仍然可以在它之后继续参与决策。
## 动手示例：用 tools/execute 加超时
超时属于「环绕分发」关注点，应该用 `tools/execute` 包裹，而不是写进工具主体。
## 实例
```
// 文件路径：my-plugins/tool-guard/src/index.ts
// 用 tools/execute 包装实际分发生命周期：给每次工具调用加 30 秒超时。
import type { Context } from '@deepseek-ai/cordis'

export const name = 'tool-guard'

export function apply(ctx: Context) {
  // tools/execute 是 waterfall：必须调用 next() 才会执行真正的工具主体。
  ctx.on('tools/execute', async (exec, next) => {
    // 注意：只有 tools/execute 视图可以替换 exec.signal。
    // 这里把调用方信号与一个 30 秒截止时间融合，覆盖掉原来的 signal。
    const originalSignal = exec.signal
    const deadline = AbortSignal.timeout(30_000)
    exec.signal = AbortSignal.any([originalSignal, deadline])
    try {
      // 委托给真正的工具 execute()；超时或调用方取消都会触发 abort。
      return await next()
    } finally {
      // 用完后恢复原信号，避免污染后续调用。
      exec.signal = originalSignal
    }
  })
}
```
规则：可以替换 exec.signal，但不能移除它。
注册表会在调用工具函数体前重新融合调用方的 signal，因此包装层替换掉 signal 是安全的。
## 动手示例：用 ctx.tools.guard() 做单调拒绝
当不变式需要「最终拒绝、不可撤销」时，用 `ctx.tools.guard()`。
注意守卫返回类型是 `string | undefined`，没有 allow 分支。
## 实例
```
// 文件路径：my-plugins/invariant-guard/src/index.ts
// 一个不可撤销的最终拒绝：禁止在 runoob 演示环境执行 run_code。
import type { Context } from '@deepseek-ai/cordis'

export const name = 'invariant-guard'

export function apply(ctx: Context) {
  // 注册一个单调守卫。返回字符串即拒绝；返回 undefined 表示维持现状。
  const disposer = ctx.tools.guard((execution) => {
    if (execution.name === 'run_code') {
      return 'run_code is disabled in the runoob demo profile.'
    }
    return undefined // 放行：让 pre-execute 的决策保持不变
  })

  // guard() 返回精确的卸载函数；插件卸载时框架会自动调用它。
  ctx.effect(() => disposer)
}
```
因为守卫没有 allow 结果，即使后面有监听器想放行 `run_code`，也无法把这次拒绝变回允许。
## 小结自测
工具执行流水线把「策略」与「工具主体」解耦，让钩子可以跨越不同工具系列而无需让工具耦合某个策略服务。
自测题：
| 问题 | 参考 |
| --- | --- |
| 想让某个工具「永远无法被任何人放行」，应该用 pre-execute 还是 guard？ | guard，因为守卫没有 allow 结果，不可撤销 |
| 要给所有工具加统一的超时，应该监听哪个事件？ | `tools/execute`，它环绕分派，可替换 signal |
| 只想记录最终结果做审计、不改任何东西，应该用哪个环节？ | `tools/result`，它观测冻结的权威结果 |
