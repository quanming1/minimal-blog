---
title: dsh 的通信地基：stdio 管道 IPC 与 octo-sdk-server
date: '2026-08-18'
description: SDK client 怎么"遥控"一个 dsh 进程？答案全在两根管道和一个插件上——进程间通信最朴素也最容易被误解的一课
tags: [dsh, IPC, Node.js, DeepSeek]
---
> 回答一个根本问题：SDK client 怎么"遥控"一个 dsh 进程？答案全在两根管道和一个插件上。
> 这是理解 dsh 集成（gateway runtime、插件开发）的地基。

## 0. 一句话全景

```
┌─────────────────────────┐                    ┌──────────────────────────┐
│  SDK client（父进程）     │      spawn + 两根管道 │  dsh harness（子进程）    │
│  例：gateway 的 dsh-engine │ ═══════════════════► │  例：octo-sdk profile    │
│  例：driver/probe.mjs     │ ◄═══════════════════ │  里面的 octo-sdk-server   │
└─────────────────────────┘                    └──────────────────────────┘
```

client 用 `spawn` 启动 dsh 子进程，操作系统自动建好**两根管道**。之后的一切——发消息、收回答、停机——都变成"往管道里写一行 JSON-RPC、从管道里读一行 JSON-RPC"。

## 1. 两根管道：同一条吸管的两头

`spawn` 的瞬间，内核建两根管道，父子各握一头：

```
父进程（client）手里的名字          子进程（dsh）眼里的名字
─────────────────────────        ──────────────────────
child.stdin   ════►  管道 #1  ════►   process.stdin     （client 写请求）
child.stdout  ◄════  管道 #2  ════◄   process.stdout    （dsh 回结果）
```

**同一根管道的两端，名字不同，只是因为站在不同进程里看。** 像一根吸管：这头吹气，那头出气，两边各叫它"我的吸管"，物理上是同一根。

## 2. `process.stdout.write` 到底写到了哪

这是最容易绕晕的一点。`process.stdout` 不是一个"地方"，是一个**插座**。写到哪里，取决于**谁启动了这个进程、把插座插在哪**：

| 启动方式 | 插座插在哪 | 结果 |
|---|---|---|
| 终端里 `node x.js` | 屏幕 | 写啥显示啥 |
| 被 `spawn` 启动 | 管道 #2 | 写进去的内容从对面 client 手里流出来，**屏幕啥都没有** |

进程自己永远不知道插座另一头连着谁，只会傻傻地 `write`，剩下的交给内核路由。这就是为什么同一个 `send()` 函数，终端手跑时 JSON 刷屏，被 SDK client spawn 时 JSON 流进管道——代码一行不用改。

## 3. 一条消息的完整旅程

harness 回答完问题后调 `process.stdout.write(JSON.stringify(obj) + '\n')`：

```
 harness 进程内              操作系统管道 #2            client 进程内
 ─────────────              ──────────────            ─────────────
 JSON.stringify + '\n'
        │
 process.stdout.write ──────► [缓冲区暂存] ──────► child.stdout 可读
                                                      │ 'data' 事件
                                                      ├─ 按 '\n' 切行
                                                      ├─ JSON.parse 还原对象
                                                      └─ 交给回调
```

两个点要记住：

1. **为什么 `+ '\n'`**——`JsonRpcLineTransport` 的 "Line" 就是按行切分，换行符是消息边界，没它对面切不出完整一条。
2. **为什么 stdout 被占了就不能 printf 调试**——`console.log` 底层就是 `process.stdout.write`，你 print 一句"调试信息"，这行会混进管道 #2，被 client 当 JSON-RPC 去 `JSON.parse`，直接解析报错、整条通信崩掉。这就是"诊断输出必须 appendFileSync 落盘"的根源。

## 4. octo-sdk-server：占 stdio 的那个插件

裸 profile 不会说 JSON-RPC——dsh 启动后沉默，client 死等握手。必须有一个插件在 stdout 上承载 JSON-RPC 服务，这个插件就是 **octo-sdk-server**（自研）。它的入口是 cordis 插件的标准函数：

```js
function apply(ctx, config) {
  const input = process.stdin;    // 占标准输入
  const output = process.stdout;  // 占标准输出
  const transport = new JsonRpcLineTransport(input, output);   // 用 stdio 建"行分隔 JSON-RPC 管道"
  const server = new ResumeSdkJsonRpcServer(ctx, transport, {...});  // 业务大脑
  transport.onRequest((method, params) => server.handleRequest(method, params));  // 接线
  ctx.effect(() => { transport.start(); return () => { transport.close(); } });   // 生命周期
}
```

`apply` 里三个角色各司其职：

| 角色 | 是谁 | 干什么 |
|---|---|---|
| `transport` | 收发员 | 拆字节、按行切、JSON.parse |
| `ResumeSdkJsonRpcServer` | 业务大脑 | 收请求、分发给会话管理，反向把内部事件发回 |
| `ctx.effect` | 生命周期钩子 | 挂载时启动、卸载时清理 |

## 5. ResumeSdkJsonRpcServer 干三件事

### 5.1 分发请求（handleRequest）

client 只会说三种话，对着 switch 一一分发：

| client 发的 | 方法 | 人话 |
|---|---|---|
| `initialize` | `initialize()` | "我在这个目录、用这个模型干活"——记账 + 确认 LLM 就位 |
| `session/prompt` | `prompt()` | "把消息发给 agent"——找到/创建会话，`followup` 塞进去 |
| `shutdown` | `shutdown()` | "下班"——释放 agent、退订事件、退出进程 |

### 5.2 管会话（名字里 "Resume" 的来源）

每次 prompt 先查会话：内存缓存有 → 复用；没有 → 查磁盘存档，有则 `agents.resume`（跨进程恢复旧上下文），否则 `agents.create`（新会话）。

这就是 gateway 杀进程重启后还能续上群上下文的支点：**进程内续跑用缓存，跨进程恢复才用 resume**。

### 5.3 反向发通知（事件泵）

它不只会被叫，还会主动往外报。构造函数订阅 harness 内部四个事件，一有动静就 `transport.notify` 塞回管道 #2：

```
 harness 内部                      server                         client
 agent 吐字 ── ctx.on("session/event") ──► notify ──管道#2──► 收到 text 增量
```

gateway 引擎收的"text-delta / final_text"事件流，源头就是这一行订阅。

## 6. IPC 家族对照（别搞混"两对进程"）

| | stdio 管道 | Unix domain socket |
|---|---|---|
| 进程对 | **父子**（spawn 天然有） | **陌生同类**（如两个 slice 抢锁） |
| 谁创建 | 内核 spawn 时自动 | 先到的进程 bind 创建文件 |
| 传什么 | 数据（聊天内容，JSON-RPC） | 协调（谁活着、何时停、抢单实例锁） |
| 占不占端口 | 不占 | 不占（这是文件路径，不是 IP:端口） |

一句话：**stdio 是父子的天生脐带，Unix socket 是陌生进程的公共门牌**。前者传数据，后者做协调。gateway 的 slice 在 Windows 上跑不起来，就是因为它依赖 Unix socket 锁 + getuid 属主校验 + POSIX 权限位这三样 Unix 专属零件——WSL 里有真 Linux 内核，这三样都在，所以能跑。

---

插件怎么写、怎么挂进 profile，见上一篇[《写一个 dsh 插件只要 20 分钟，跑起来花了 6 小时》](/minimal-blog/posts/dsh-plugin-six-hours/)。
