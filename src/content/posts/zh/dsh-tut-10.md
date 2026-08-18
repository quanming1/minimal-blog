---
title: DeepSeek Harness 第一个工具
date: '2026-08-18'
description: DeepSeek Harness 第一个工具——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-define-tool.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 开发第一个工具：defineTool
工具是 Agent 用来干活的函数，模型看到工具定义后决定调用。
本章节我们将用 defineTool 写出第一个工具 greet，并让模型真的调用它。
## 工具是什么
工具（tool）是一个描述清晰的函数，包含名称、说明、参数和输出格式。
模型在生成回复时，可以根据这些信息发起调用。
在 dsh 里，工具通过 ctx.tools.register 注册到工具注册表。
## defineTool 的完整结构
defineTool 是定义工具的 DSL，它接收一个对象，描述工具的全部信息。
| 字段 | 作用 | 说明 |
| --- | --- | --- |
| **name** | 工具名 | 模型用它发起调用 |
| **description** | 工具说明 | 告诉模型这个工具做什么 |
| **parameters** | 入参 schema | 类型化定义，defineTool 据此推导并校验 args |
| **output.schema** | 返回值 schema | 声明 execute 返回的规范值类型 |
| **output.render** | 结果格式化 | 把规范值转成面向模型的内容 |
| **execute** | 工具实现 | 真正执行逻辑，返回规范值 |
## 创建 greet 工具
把 scratch-plugin/src/my-plugin.ts 替换为以下内容。
## 实例
```
// 文件路径：scratch-plugin/src/my-plugin.ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'greet-tool'
// 需要 tools 服务：注册工具的前提
export const inject = ['tools']

export function apply(ctx: Context) {
  // 注册一个名为 greet 的工具
  ctx.tools.register(defineTool({
    // 工具名：模型会以这个名字发起调用
    name: 'greet',
    // 工具说明：告诉模型什么时候用
    description: 'Greet someone by name.',
    // 入参 schema：defineTool 会推导并校验 args
    parameters: {
      name: { type: 'string', required: true, description: 'The name to greet' },
    },
    // 输出定义
    output: {
      // 规范值类型：execute 的返回值
      schema: { type: 'string' },
      // render：把规范值转成面向模型的内容
      render: (_args, value) => [{ type: 'text', text: value }],
    },
    // 工具实现：真正执行逻辑
    async execute(args) {
      // 返回规范值，这里是一个字符串
      return `Hello, ${args.name}!`
    },
  }))
}
```
inject 让 Cordis 等待工具注册表就绪。
defineTool 根据 parameters 推导并校验 args。
execute 返回 output.schema 声明的规范值。
output.render 再把规范值转换为面向模型的内容。
![](/minimal-blog/assets/dsh-tut/runoob_1786761995720-1.png)
## 运行并调用
如果开发命令没在运行，重新启动：
```

pnpm dsh web --patch ./scratch-plugin/cordis.yml
```
打开 http://127.0.0.1:3080，输入：
```

Use the greet tool to greet RUNOOB.
```
![](/minimal-blog/assets/dsh-tut/runoob_1786761995720.png)
模型可以调用 greet，并收到 Hello, RUNOOB! 这一工具结果。
![](/minimal-blog/assets/dsh-tut/10-tool-pipeline.svg)
## 关键点：schema 自动流入提示词
工具的 name、description、parameters、output 会自动组装进模型提示词。
模型"知道"有这样一个工具，就会在合适的时候调用。
你不需要手写函数签名给模型，schema 就是模型看到的接口。
**规范值**（canonical value）是 execute 返回、output.schema 声明的值。
它与"面向模型的内容"解耦：同一个规范值可以通过不同 render 变成不同格式。
提示：想查看更复杂的工具写法（嵌套 schema、后台工作、策略钩子），见官方工具编写参考。
## 小结与自测
defineTool 用 schema 描述工具，ctx.tools.register 注册它，模型看到 schema 后直接调用。
1. defineTool 的 execute 返回的是什么？
2. output.render 的作用是什么？
3. 模型是怎么知道要调用 greet 的？
