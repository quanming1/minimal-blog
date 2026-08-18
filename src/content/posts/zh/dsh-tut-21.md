---
title: DeepSeek Harness 组合包
date: '2026-08-18'
description: DeepSeek Harness 组合包——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-bundle-profile.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 组合包 bundle 与 profile：两个 manifest
之前的章节我们用 --patch overlay 加载本地插件，这篇开始把它们打包成可安装的组合包。
本章节我们将讲清楚两个最基础的概念：bundle（组合包） 与 profile，以及它们各自的 manifest。
## 两个概念，两种 manifest
安装机制建立在两个概念之上，二者都由一份 package.json 描述。
它们在 dsh 键下携带的 manifest 种类不同，回答的问题也不同。
![](/minimal-blog/assets/dsh-tut/21-bundle-profile.svg)
组合包是附带一个配置层的 npm 包。
它的 manifest 声明 dsh.bundle，回答的是"这个包贡献什么"：一个插入或覆盖插件行的 patch 文件。
profile 是位于 $DSH_HOME/profiles/&lt;name&gt; 下、描述一份可启动组合的目录。
它的 manifest 声明 dsh.profile，回答的是"这套配置由哪些组合包按什么顺序组成"。
**bundle** 是你编写并分发的东西；**profile** 是用户用 `dsh --profile ` 启动的东西。
没有东西同时是两者。
| 概念 | manifest 键 | 回答的问题 | 谁编写 / 谁使用 |
| --- | --- | --- | --- |
| **bundle（组合包）** | `dsh.bundle` | 这个包贡献什么（一个 patch 文件） | 插件作者编写，随包分发 |
| **profile** | `dsh.profile` | 这套配置由哪些 bundle 按什么顺序组成 | 由 `dsh plugin` 自动创建维护，用户启动 |
profile 位于安装目录之外，路径模板是 $DSH_HOME/profiles/&lt;name&gt;。
## 动手：创建 hello-plugin 组合包
按官方教程，先创建包目录。
## 实例
```
mkdir -p hello-plugin
```
组合包目录结构如下，一共三个文件。
## 实例
```
hello-plugin/
├── package.json       # 声明 dsh.bundle
├── cordis.patch.yml   # profile 列出该 bundle 时应用的配置层
└── index.js           # patch 行引用的插件模块
```
创建 hello-plugin/package.json，声明组合包 manifest。
## 实例
```
{
  "name": "dsh-hello-plugin",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "files": ["index.js", "cordis.patch.yml"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```
package.json 各字段的含义如下。
| 字段 | 说明 |
| --- | --- |
| `name` | 包名，Node 模块解析靠它找到已安装的代码 |
| `version` | 版本号 |
| `type` | `"module"` 表示使用 ESM 模块格式 |
| `main` | 入口文件 |
| `files` | 发布时只包含的文件清单 |
| `dsh.bundle.patch` | 组合包 manifest：声明贡献的 patch 文件路径 |
创建 hello-plugin/index.js，写入插件入口。
## 实例
```
// 文件路径：hello-plugin/index.js
export const name = 'hello-plugin'  // 插件名，用于日志与诊断

export function apply() {
  console.log('[hello-plugin] plugin loaded!')  // 加载时打印一行日志
}
```
创建 hello-plugin/cordis.patch.yml。
## 实例
```
# 文件路径：hello-plugin/cordis.patch.yml
# 这个 patch 与一直用的 --patch overlay 一样，是 patch 条目的 YAML 数组
# 区别：插件行按包名而不是相对源码路径引用，Node 模块解析才能找到已安装的代码
- insert:
    - id: hello
      name: dsh-hello-plugin
```
这个 patch 与 --patch overlay 完全同构。
关键区别在 name 字段：这里写的是包名 `dsh-hello-plugin`，而不是相对源码路径。
安装后 pnpm 把包链接到 node_modules，Node 的模块解析就能按包名找到已安装的代码。
没有 `dsh.bundle` 声明的包仍然可以安装，但只作为普通依赖。
此时 `dsh plugin` 会打印警告，且不激活任何层。
如果一个库供插件包 import、而不是供用户启用，就使用这种包格式。
## profile manifest：从不需要手写
profile 目录包含两个文件。
第一个是 package.json，包含 profile 的树外插件依赖（由 pnpm 管理），加上 `dsh.profile` manifest 及其有序的 bundles 列表。
第二个是 cordis.patch.yml，是用户自己的 patch 层，在每个组合包层之后应用。
profile manifest 从不需要手写。
`dsh plugin` 负责创建和维护它，下一篇安装插件时会展示它的真实结果。
## 进阶：让表层组合包持有自己的命令行
定义了可运行应用的组合包，可以挂载一个普通提供方插件来持有自己的命令行。
这个提供方插件导出 inject = ['cmdlineArgs']，用自己的 commander program 调用 `parseCmdline`，再在 program 自己的 action 中把应用自有服务提供出去。
## 实例
```
# 挂载提供方插件：id 随意，name 指向 bundle 包内的 startup 模块
- id: hello-startup
  name: 'dsh-hello-plugin/startup'
```
受这些参数配置的行会注入提供方服务，并在自己的 !!js 选项中读取它，同时把部署取值写在旁边作为回退。
## 实例
```
# 示例：端口号来自提供方服务，取不到时回退到 8080
- id: my-app
  name: '@example/my-app'
  inject: [myAppStartup]
  config:
    port: !!js ctx.myAppStartup.port ?? 8080
```
启动器把自身 flag 之后的同一份不可变参数交给每个插件，因此添加应用专属 flag 无需修改启动器，多个插件也可以解析同一份快照。
遇到 --help 时，提供方不会发布该服务，所以这些行不会激活。
Loader 只挂载一次组合，等待每一行的普通注入，再基于其已注入的上下文求值该行的 `!!js` 配置。
## 小结与自测
组合包声明 `dsh.bundle` 回答"贡献什么"，profile 声明 `dsh.profile` 回答"由哪些 bundle 组成"，两者由一份 package.json 承载但 manifest 不同。
自测题：
- bundle 的 manifest 声明哪个键，回答什么问题？
- profile 位于哪个目录，它的 manifest 回答什么问题？
- 为什么 hello-plugin 的 cordis.patch.yml 里用包名而不是相对源码路径？
