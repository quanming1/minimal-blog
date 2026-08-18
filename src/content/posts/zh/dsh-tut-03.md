---
title: DeepSeek Harness 使用
date: '2026-08-18'
description: DeepSeek Harness 使用——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-start.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 第一次使用
上一节我们介绍了 DeepSeek Harness 安装，一键安装命令：
```

npx @deepseek-ai/dsh web
```
![](/minimal-blog/assets/dsh-tut/dsh-12.webp)
注意，安装前先确保已经安装了 Node.js:
```

node -v
```
输出版本号类似 v22.23.1，说明安装成功～
目前在内测，打开 http://127.0.0.1:3080/ 会看到内测声明，点击继续就好了：
![](/minimal-blog/assets/dsh-tut/dsh-3.webp)
整个界面如下，我们可以先点击设置配置 API key（申请地址：[https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)）：
![](/minimal-blog/assets/dsh-tut/dsh-4.webp)
![](/minimal-blog/assets/dsh-tut/dsh-5.webp)
创建一个目录 DeepSeekProjects 作为工作区：
```

mkdir DeepSeekProjects
```
![](/minimal-blog/assets/dsh-tut/dsh-6.webp)
DeepSeek Harness 提供四种运行模式：标准模式、PTC模式、极简模式、创造模式。
![](/minimal-blog/assets/dsh-tut/dsh-7.webp)
标准模式：新手首选，内置完整代码 Agent 能力，文件操作、Shell、检索、任务规划、子 Agent 等插件预装，开箱即用。
PTC 模式：能力同标准模式。支持用 TypeScript 批量编排工具调用，合并多轮交互，减少对话次数、节约 Token。依赖较强代码规划能力，调试难度更高；建议大量重复调用场景再切换。
极简模式：仅保留持久 Bash 与文件编辑器，移除附加功能。用于模型基准性能测试，不适合日常开发。
创造模式：具备标准模式全部能力，可探查 Cordis 运行环境，在线调试插件、创建新 Agent，实现功能自主扩展。
我们选定模式，点击新会话，输入需求即可开启对话：
![](/minimal-blog/assets/dsh-tut/dsh-8.webp)
使用过程还会帮我们分析需求：
![](/minimal-blog/assets/dsh-tut/dsh-9.webp)
DeepSeek Harness 权限用于控制智能体（Agent）访问本机文件、执行命令的范围，安全等级从高到低：Read Only &gt; Workspace Write &gt; Full access。
![](/minimal-blog/assets/dsh-tut/runoob_1786707893728.png)
- **Read Only：**仅可读取工作区文件，无法修改文件、执行终端命令，安全性最高。

插件生态在设置页面里可以看到：
![](/minimal-blog/assets/dsh-tut/dsh-10.webp)
接下来估计很多社区插件会开发出来，关注 [https://github.com/topics/dsh-plugin。](https://github.com/topics/dsh-plugin。)
完整执行流程：
![](/minimal-blog/assets/dsh-tut/runoob-web-ui-flow.svg)
