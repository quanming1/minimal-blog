---
title: DeepSeek Harness 服务隔离
date: '2026-08-18'
description: DeepSeek Harness 服务隔离——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-isolation-scope.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 服务隔离与作用域
本章节我们将介绍同一个服务，怎么让不同插件组看到不同实例。
这背后是 Cordis 的 服务隔离（service isolation）与 agent 作用域（scope）机制。
## 服务隔离：isolate
cordis.yml 支持服务隔离：同一个服务可以有多个实例，不同插件组看到不同实例。
关键词是 isolate 配置，配合 group 插件把插件分成组。
## 实例
```
# 文件路径：scratch-plugin/cordis.yml
# 定义两个插件组 group-a 与 group-b，各自隔离一份 shell 服务
- id: group-a
  name: '@deepseek-ai/cordis-plugin-group'
  group: true
  isolate:
    shell: true              # 让本组内的 shell 服务独立实例化
  config:
    - name: '@deepseek-ai/dsh-bash-local'
      config:
        timeoutMs: 5000      # group-a 的 Bash 超时 5 秒
    - name: './src/plugin-a.ts'

- id: group-b
  name: '@deepseek-ai/cordis-plugin-group'
  group: true
  isolate:
    shell: true
  config:
    - name: '@deepseek-ai/dsh-bash-local'
      config:
        timeoutMs: 60000     # group-b 的 Bash 超时 60 秒
    - name: './src/plugin-b.ts'
```
plugin-a 和 plugin-b 各自看到自己组内的 Bash 实例，互不影响。
group-a 的 Bash 命令超时 5 秒，group-b 的超时 60 秒，两边互不知道对方的存在。
![](/minimal-blog/assets/dsh-tut/15-isolation-scope.svg)
## 为什么需要隔离
不同任务对同一能力的需求可能完全不同。
比如快速交互的任务希望 Bash 快速超时，而长任务希望给足时间。
隔离让同一份服务按组配置、按组生效，而不是全局一刀切。
## 作用域：scope
scope 是按 agent（智能体）划分的注册单位。
一项贡献（工具、提示词段、变量、限制、监听器）要么是全局的，要么归属于恰好一个 scope key。
| 概念 | 含义 |
| --- | --- |
| **scope** | 按 agent 划分的注册单位；只有两层，采用扁平结构 |
| **scope key** | scope 的不透明标识；一个活跃的 agent 就是其自身 scope 的 key |
| **agent.ctx** | agent 的带作用域上下文，注册既有 scope 可见性，生命周期也绑定该 scope |
| **shadowing** | 最具体者胜出的名称解析：带作用域的工具 / 片段 / 变量仅在自身 scope 内替换全局同名项 |
| **restriction** | tools.restrict 为单个 scope 过滤全局工具集合，多个 restriction 取交集组合 |
| **lineage** | 以数据形式携带的父子关系事实（parentSession、delegationDepth 等），从不影响可见性 |
带作用域的注册不会向下继承给 subagent。
子树行为通过 lineage 数据表达，而不是通过 scope 结构。
## shadowing：最具体者胜出
shadowing 是按 agent 定制 persona 和定制工具变体的机制。
一个带作用域的工具，仅在该 scope 内替换同名的全局工具；其它 agent 仍看到全局版本。
## restriction：过滤全局工具
restriction 用 tools.restrict 为单个 scope 过滤全局工具集合。
被过滤掉的全局工具既不进入提示词，也拒绝执行，与不存在的工具无法区分。
换句话说，restriction 让一个 scope 里的 agent 完全「看不见」某些全局工具，而不是在调用时再拒绝。
## 小结自测
isolate 让同一服务按组实例化，scope 按 agent 划分注册，shadowing 与 restriction 分别实现同名替换与全局过滤。
自测一下：
- isolate: { shell: true } 让 group-a 与 group-b 的 Bash 实例是什么关系？
- 带作用域的注册会不会继承给 subagent？
- shadowing 与 restriction 各自解决什么问题？
