---
title: 写一个 dsh 插件只要 20 分钟，跑起来花了 6 小时
date: '2026-08-18'
description: 从零写一个 dsh 插件：代码 20 分钟，跑起来花了 6 小时——三个文档没写的契约，一份静默挂死排查表
tags: [dsh, 插件开发, 踩坑复盘, DeepSeek]
---
dsh（DeepSeek Harness）是 DeepSeek 官方的 Agent 运行器，它的 LLM 对接、工具执行、会话管理，全是插件。写一个插件，我原本以为最难的是代码；结果代码 20 分钟写完，剩下 6 小时，全在让它在 dsh 里跑起来——而且不是 5 小时调优，是 5 小时对着一片空白屏幕，等一个永远不来的启动日志。

## 我们最初的想法：一个函数而已

目标是写一个 `session-stats` 插件：监听会话事件，统计每轮模型吐了多少字、思考了多少、调了几次工具，落盘成 JSONL。照白皮书写，插件的全部契约就是一个入口函数：

```js
export function apply(ctx, config) {
  ctx.on("session/event", (session, event) => { /* ... */ });
}
```

纯函数抽出来，单测用 node:test 零依赖写，7 条用例瞬间全绿。到这一步 20 分钟，我判断剩下的就是"挂上去跑一下"。

然后 dsh 静默挂死了。没有报错、没有日志、没有超时提示，什么都不输出，进程赖着不退。

## 六轮静默挂死，换回三个文档没写的契约

第一个坑就超纲了：插件经 insert 挂载时如果带了 config，**必须声明 Config Schema**。没声明？整个 profile 启动直接卡死，零报错——现象是"静默挂"，原因是"缺 schema"，两者之间没有任何可追的线索。

排查像在拆一个不响的炸弹。我最后把它总结成一张排查表，每一步都是那 6 小时里真金白银踩出来的：

| 顺序 | 查什么 | 一句话 |
|---|---|---|
| 1 | 清僵尸进程 | 强杀留下的 dsh 进程会占全局锁，让后续所有 profile 静默挂死 |
| 2 | 换已知好 profile 对照 | 好 profile 也挂 = 环境坏；只有自己的挂 = profile 特有 |
| 3 | 二分 patch.yml | 摘掉自己的 insert 看通不通，再逐段加回 |
| 4 | 查插件包完整性 | node_modules 里和 plugins 源里的 package.json 都在吗 |
| 5 | 查 bundles 与 deps 一致性 | 有没有被 install 命令悄悄重写过 |
| 6 | 加了 config 才挂 | 十有八九缺 Config Schema |

最终挖出三个白皮书没写的硬契约：

**契约一：insert 带 config 的插件，必须声明 Config Schema。** 用 schemastery 声明一个对象，键与 insert.config 对齐。不声明，静默挂死。

**契约二：事件回调是 (session, event)，事件在第二个参数。** 我一开始按单参数 `payload.event` 解析，事件全丢且零报错——直到读 dsh 源码才看到 `callbackArgs = [this, event]`。

**契约三：挂载有两条路，别混。** bundles 路线要插件自带 `dsh.bundle` 清单；insert 路线不用，但 config 必须对齐 Schema。新手走 insert 更省事。

压垮骆驼的最后一根稻草最讽刺：是 robocopy 的 `/XF` 参数。我本意是复制 profile 时排除根目录的 package.json，结果 `/XF` 是全局递归排除，把插件包自己的 package.json 也剥了——于是 bundle 解析失败，又一轮静默挂死。

## 最贵的一课：问题从不出在代码

复盘这 6 小时，代码本身没有任何 bug，纯函数单测从头到尾全绿。时间全花在"文档没写出来的契约"上。

我一度怪 dsh 文档不完整。后来想明白了：rc 阶段的框架，文档必然追不上实现。真正该改的是自己的工作方式——把**实测当成开发的一部分**，而不是代码写完才想起去跑。写代码 20 分钟，是为了能尽早撞上那 6 小时。

实测跑通的那一刻，插件产出和预期完全对账：模型回了"收到"两个字，统计里的 `textChars` 正好是 2，23 个事件一个不漏。

## 留给下一个写 dsh 插件的人

一套能直接抄的骨架：

1. `src/logic.mjs` 纯函数（零 dsh 依赖，可单测）+ `src/index.mjs` 只做接线
2. 入口必须带 Config Schema（schemastery），事件回调记得是双参数
3. 输出用 `appendFileSync` 落盘，别用 console.log——SDK 模式下 stdout 被 JSON-RPC 占用，print 一句调试信息就会让整条通信崩掉
4. 实测回合用 SDK client 驱动，别用 `type probe.jsonl | dsh`（喂完即 EOF，回合没跑完管道先断）
5. 排查第一步永远是清僵尸进程

## 残余风险

dsh 还停在 rc 阶段，上面这些契约随时可能变。这份记录对 0.1.0-rc.6 有效，换版本请重新实测——尤其是事件名，rc 阶段它们一直在变，别拿旧版本的清单当新版本的真相。
