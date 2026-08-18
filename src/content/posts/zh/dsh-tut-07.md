---
title: DeepSeek Harness 加载插件
date: '2026-08-18'
description: DeepSeek Harness 加载插件——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-load-plugin.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 加载本地插件
上一篇 [DeepSeek Harness 第一个插件](https://www.runoob.com/deepseek-harness/deepseek-harness-first-plugin.html) 写好了 hello-plugin 的源码，接下来我们把它加载进 Web UI。
这里我们会用到两个东西：patch 覆盖层 cordis.yml 和 --patch 启动参数。
## scratch-plugin 目录结构
之前我们创建了 scratch-plugin/src，现在再加一个 cordis.yml。
整个临时项目的结构如下：
```

scratch-plugin/
├── src/
│   └── my-plugin.ts    # 插件源码（上一篇写的 hello-plugin）
└── cordis.yml          # patch 覆盖层：告诉框架插入哪个插件
```
## cordis.yml 的 insert
在仓库根目录运行 pwd，拿到绝对路径。
然后创建 scratch-plugin/cordis.yml，内容如下：
## 实例
```
# 文件路径：scratch-plugin/cordis.yml
# 这是一个 Web 覆盖层（overlay），只负责插入本地插件
- insert:
    - id: hello
      # name 是插件文件路径，必须是绝对路径！
      name: '/absolute/path/to/deepseek-harness/scratch-plugin/src/my-plugin.ts'
```
把 /absolute/path/to/deepseek-harness 替换成 pwd 打印的真实路径。
![](https://www.runoob.com/wp-content/uploads/2026/08/runoob_1786710667242.png)
插件路径必须是绝对路径。
patch 文件只贡献配置，不会改变 loader 解析模块路径时使用的 profile 目录。
## 用 --patch 启动
用这个覆盖层启动 Web UI：
```

pnpm dsh web --patch ./scratch-plugin/cordis.yml
```
启动期间，终端会打印 [hello-plugin] plugin loaded!。
![](https://www.runoob.com/wp-content/uploads/2026/08/runoob_1786710734619.png)
打开 http://127.0.0.1:3080，在设置插件列表中搜索 hello，可以看到我们安装的插件。
![](https://www.runoob.com/wp-content/uploads/2026/08/runoob_178671091647.png)
![](https://www.runoob.com/wp-content/uploads/2026/08/07-patch-load.svg)
## 工作原理
dsh 把多个配置来源按顺序叠加成一个最终配置。
--patch 传入的 cordis.yml 是一个覆盖层，在启动时叠加进 profile。
| 概念 | 是什么 | 作用 |
| --- | --- | --- |
| **profile** | 一份可启动的组装配置 | 决定 Web UI 由哪些组合包组成 |
| **patch 覆盖层** | 启动时额外叠加的 yml | 插入本地插件、覆盖某项配置 |
| **insert** | patch 里插入插件的语法 | 按 name 绝对路径加载插件 |
提示：--patch 适合本地开发调试。
要把插件交付给其他人时，用组合包（bundle）的方式，见第 21 篇。
