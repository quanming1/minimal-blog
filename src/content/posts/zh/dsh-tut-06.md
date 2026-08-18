---
title: DeepSeek Harness 插件
date: '2026-08-18'
description: DeepSeek Harness 插件——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-first-plugin.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 第一个插件
在 Harness 中，插件是一个导出 apply 函数的 TypeScript 模块。
框架在加载插件时调用 apply，并传入一个 ctx（上下文对象）。
我们通过 ctx 注册能力，比如事件监听、工具、LLM 适配器。
**ctx**（Context）是框架传给每个插件的上下文对象。
**ctx** 既是注册能力的入口，也记录了插件注册的一切资源。
## 创建本地项目
我们需要先通过源码安装：
```
git clone https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
pnpm install
pnpm run build
pnpm dsh web
```
接下来创建一个 scratch-plugin 项目，用来放我们的插件。
在仓库根目录执行：
```

mkdir -p scratch-plugin/src
```
## 最小插件：hello-plugin
在 scratch-plugin/src 下创建 my-plugin.ts。
```

cd scratch-plugin/src
```
下面是完整可用的插件配置，不差任何东西。
## 实例
```
// 文件路径：scratch-plugin/src/my-plugin.ts
import type { Context } from '@deepseek-ai/cordis'

// name 是插件名，用于在日志与配置中标识这个插件
export const name = 'hello-plugin'

// apply 是插件的入口：框架加载插件时调用它
export function apply(ctx: Context) {
  // 需要的依赖在 apply 执行前就已就绪（见第 9 篇）
  console.log('[hello-plugin] plugin loaded!')
}
```
这段代码只做一件事：加载时打印一行日志，它没有注册任何能力，但已经是一个合格的插件。
## 插件的三种形态
除了上面看到的函数形式，插件还支持对象形式和类形式。
| 形态 | 写法 | 适用场景 |
| --- | --- | --- |
| **函数形式** | 导出独立的 apply 函数 | 大多数插件，最简单直接 |
| **对象形式** | export default 一个带 name / inject / apply 的对象 | 需要同时声明元信息时 |
| **类形式** | export default 一个 Service 子类 | 插件需要向其他插件提供服务时 |
### 函数形式
把 name 和 apply 分开导出，是官方示例默认的写法。
## 实例
```
// 文件路径：scratch-plugin/src/my-plugin.ts（函数形式）
import type { Context } from '@deepseek-ai/cordis'

export const name = 'my-plugin'

export function apply(ctx: Context) {
  // 在这里注册能力
}
```
### 对象形式
把 name、inject 和 apply 放进一个默认导出的对象。
## 实例
```
// 对象形式：一个默认导出对象
import type { Context } from '@deepseek-ai/cordis'

export default {
  name: 'my-plugin',
  inject: ['tools'],
  apply(ctx: Context) {
    // ...
  },
}
```
### 类形式
类形式继承 Service 基类，适合对外提供服务的插件。
## 实例
```
// 类形式：Service 子类，可对外提供服务
import { Service, type Context } from '@deepseek-ai/cordis'

export default class MyService extends Service {
  static inject = ['tools']

  constructor(ctx: Context) {
    // 第一个参数是 ctx，第二个参数是服务名
    super(ctx, 'myService')
    // 同步初始化放在构造函数里
  }
}
```
## 怎么选
大多数情况下，函数形式就足够了。
当插件需要向其他插件提供服务时，用类形式。
提示：类形式的核心是 super(ctx, '服务名')。
服务与依赖的完整机制会在第 14 篇展开。
![](/minimal-blog/assets/dsh-tut/06-plugin-structure.svg)
