---
title: DeepSeek Harness 防御性编程
date: '2026-08-18'
description: DeepSeek Harness 防御性编程——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deeseek-harness-defensive-patterns.html)，仅作学习备份，版权归原作者所有。
# DeeSeek Harness 防御性编程：结果报告、清理与凭据
写了这么多插件，你可能会遇到一类「平时测不出来、一上线就出事」的边界 bug。
官方文档把它们归纳成「来之不易的缺陷类别规则」——每一条都是真实发布或差点发布过的缺陷。
这一篇讲五个最重要的防御性编程模式：结果报告、dispose 停稳、凭据擦除、链接删除、回调隔离。
一句话：这些模式防止「一个简单的边界情况把整个 Agent 搞挂」。
## 先看对照图
下面的图把坏示例与好示例并排对比，每条都来自真实的缺陷类别。
![](https://www.runoob.com/wp-content/uploads/2026/08/27-defensive-patterns.svg)
官方把这些模式称作「在编写生命周期、并发、子进程或清理代码之前请先阅读本文」的规则。
## 正交结果独立上报
一个结果可以同时具有多种性质：进程可能已经超时，却仍以退出码 0 结束，因为它捕获了终止信号。
每个独立事实（`timedOut`、`signal`、`exitCode`）都应单独上报。
千万不要把一个标志的上报嵌套在另一个标志的分支里，否则调用方可能把提前终止的运行误判为正常成功。
## 实例
```
// 文件路径：packages/my-shell/src/run.ts
// 运行一个子进程，并正交上报三个独立事实：timedOut、signal、exitCode。
import { spawn, type ChildProcess } from 'node:child_process'

export interface RunResult {
  timedOut: boolean      // 独立事实 1：是否超时
  signal: NodeJS.Signals | null // 独立事实 2：是否被信号终止
  exitCode: number | null       // 独立事实 3：退出码
  stdout: string
  stderr: string
}

export function run(argv: string[], timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child: ChildProcess = spawn(argv[0], argv.slice(1), {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d: Buffer) => (stdout += d))
    child.stderr.on('data', (d: Buffer) => (stderr += d))

    // 独立事实 1 单独维护：超时是一个标志，与退出码无关。
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM') // 超时触发终止
    }, timeoutMs)

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      // 三个字段各自独立返回：进程可能 timedOut=true 且 exitCode=0，
      // 因为它在超时后捕获了 SIGTERM 并以 0 退出。
      resolve({ timedOut, signal, exitCode: code, stdout, stderr })
    })
    child.on('error', reject)
  })
}
```
有了这种写法，调用方可以组合判断：`timedOut` 为真但 `exitCode` 为 0，说明「被强杀但进程用 0 掩盖了」。
如果嵌套上报，这个组合就永远表达不出来。
## dispose 必须达到完全停稳
如果清理流程只发出终止或中止信号便返回，而不等待工作真正停止，就会留下孤儿进程。
清理逻辑应采用异步流程，并等待子进程退出（发出终止信号后等待 `done`）。
还应在终止进程前关闭监听器注册表和通知注册表，使迟到的完成事件保持静默。
## 实例
```
// 文件路径：packages/my-shell/src/dispose.ts
// dispose 必须完全停稳：发信号后等待子进程退出，而不是只发信号就返回。
import { once } from 'node:events'
import type { ChildProcess } from 'node:child_process'

export async function disposeQuiescent(child: ChildProcess): Promise<void> {
  // 1. 先移除监听器，让迟到的完成事件保持静默。
  child.removeAllListeners()

  // 2. 请求停止：发出终止信号。
  child.kill('SIGTERM')

  // 3. 等待子进程真正退出；若超时仍不退，升级到 SIGKILL。
  //    Promise.race 保证 dispose 不会被一个不肯退出的子进程永远挂起。
  const forceKill = new Promise<void>((resolve) => {
    setTimeout(() => {
      child.kill('SIGKILL')
      resolve()
    }, 5_000)
  })

  await Promise.race([once(child, 'exit').then(() => undefined), forceKill])
}
```
这样 dispose 返回时，子进程要么已退出，要么已被 SIGKILL 强制终止。
## 凭据擦除：绝不把环境变量暴露给不可信输出
启动的命令应使用经过清理的环境变量，移除名称匹配 `*KEY*`、`*SECRET*`、`*TOKEN*` 或 `*PASSWORD*` 的项。
否则 harness 凭证可能通过命令输出、`env` 或 spill 文件泄漏。
临时文件和 spill 文件应放在权限为 0700 的私有目录中，使用随机文件名，并以独占且仅所有者可访问的方式打开（`'wx'`、`0o600`）。
## 实例
```
// 文件路径：packages/my-shell/src/env.ts
// 启动命令前清理环境变量，防止 harness 凭证经命令输出或 env 泄漏。
// 匹配 *KEY* *SECRET* *TOKEN* *PASSWORD* 的敏感项一律移除。
const SENSITIVE_NAME = /.*(?:KEY|SECRET|TOKEN|PASSWORD).*/i

export function scrubEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const clean: Record<string, string> = {}
  for (const [key, value] of Object.entries(env)) {
    if (SENSITIVE_NAME.test(key)) continue // 敏感键直接跳过
    if (value !== undefined) clean[key] = value
  }
  return clean
}

// 用法：spawn(argv[0], argv.slice(1), { env: scrubEnv(process.env), ... })
```
在 runoob 环境里，`DEEPSEEK_API_KEY` 这类变量必须走这条擦除路径。
让命令输出、`env` 或 spill 文件带上它，等于把密钥交给了任何能读到输出的对象。
## 符号链接用 unlink 删除
可能是符号链接或 Windows junction 的路径，应先用 `lstatSync().isSymbolicLink()` 判断，再用 `unlinkSync` 删除。
unlink 只删除链接本身并拒绝真实目录，因此绝不会跟随链接进入其目标。
Windows 上对 junction 调用 `rmSync(link)` 会抛 `ERR_FS_EISDIR`；递归删除可能穿过 junction 进入其目标。
只有真实目录才使用带 `recursive` 的 `rmSync`。
## 实例
```
// 文件路径：packages/my-fs/src/remove.ts
// 链接形态的路径用 unlink 删除，绝不递归跟随链接进入其目标。
import { lstatSync, rmSync, unlinkSync } from 'node:fs'

export function removePath(p: string): void {
  // 先判断是不是符号链接（或 Windows junction）。
  if (lstatSync(p).isSymbolicLink()) {
    // unlink 只删除链接本身并拒绝真实目录，不会跟随链接。
    unlinkSync(p)
    return
  }
  // 确认真实目录后，才使用带 recursive 的 rmSync。
  rmSync(p, { recursive: true })
}
```
## 分发器中隔离回调异常
用户提供的监听器如果抛出异常，不得导致它所在的 promise 被 reject，也不得饿死排在它后面的监听器。
请用 try/catch 包裹分发循环并记录日志。
一个行为不当的订阅者绝不能破坏核心生命周期。
## 实例
```
// 文件路径：packages/my-events/src/dispatch.ts
// 分发器隔离回调异常：一个坏订阅者不能破坏核心生命周期。
export function dispatch(listeners: ReadonlyArray<() => void>): void {
  for (const listener of listeners) {
    try {
      listener()
    } catch (err) {
      // 记录日志并继续分发，绝不 reject，也绝不饿死后面的监听器。
      console.error('[dispatch] a listener failed:', err)
    }
  }
}
```
这个模式在 dsh 内部随处可见：`session/event` 的观察者失败会被记录并隔离，而不让已提交的 append 失败。
它保证「一个插件写崩了监听器」，不会让整个 Agent 循环停摆。
## 更多模式一览
官方文档还记录了另外两条，值得记住：
| 模式 | 规则 |
| --- | --- |
| 公共约定两侧都要遵守 | 收到同一结果的多种表示时，应在通过公共 API 返回前规范化；消费方不必猜测异常来自提供方、包装层还是自身组装逻辑 |
| 异步状态不是同步状态 | 不要把 `agent/status` 或 `whenIdle()` 当作某次 `followup()` 的结果；真正拥有一次运行的调用方必须显式定义区间 |
这些规则的测试对应面（真实入口路径、验证实际结果、资源归属）在 testing.md 里展开，下一篇会提到。
## 小结自测
防御性编程把「容易在边界上翻车」的坑提前堵住：结果正交上报、dispose 完全停稳、凭据擦除、链接安全删除、回调异常隔离。
自测题：
| 问题 | 参考 |
| --- | --- |
| 一个进程超时了，但退出码是 0，说明什么？ | 它可能捕获了终止信号并自行以 0 退出；timedOut 与 exitCode 是两个独立事实 |
| 清理子进程时只发 SIGTERM 就返回，风险是什么？ | 留下孤儿进程；应等待退出，超时再升级 SIGKILL |
| 要删除一个可能是符号链接的路径，用什么？ | 先 lstatSync 判断，再用 unlinkSync；真实目录才用 rmSync recursive |
