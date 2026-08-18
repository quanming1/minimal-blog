---
title: DeepSeek Harness 安装
date: '2026-08-18'
description: DeepSeek Harness 安装——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-install.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 安装
本章节介绍**三种安装方式：npm 一键安装、源码安装、Python SDK。**
### 安装前准备
**DeepSeek Harness 的运行时基于 Node.js**，官方推荐的一键安装方式不需要任何额外依赖。源码安装还需要 pnpm 与 Git。Python SDK 方式需要 Python 3.10 及以上版本。
操作系统：**Linux、macOS 或 Windows** 均可Python SDK 支持 Linux x64 / arm64 与 macOS 14+（arm64）。
| 环境要求 | npm 一键安装 | 源码安装 | Python SDK |
| --- | --- | --- | --- |
| **Node.js** | 必须 | 必须 | 不需要（SDK 自带运行时） |
| **Git** | 可选 | 必须 | 必须 |
| **pnpm** | 不需要 | 必须 | 不需要 |
| **Python 3.10+** | 不需要 | 不需要 | 必须 |
| **DeepSeek API 密钥** | 三种方式都需要（用于配置模型；也支持 OpenAI 兼容端点） |
先检查本机环境, 需要 Node.js，例如 v20+：
```
node -v
```
源码安装时需要 git：
```
git --version
```
安装方式：
| 方式 | 适合谁 | 产出 |
| --- | --- | --- |
| **npm 一键安装** 推荐 | 绝大多数用户：想最快体验 Web UI | 启动 Web UI，默认 `http://127.0.0.1:3080` |
| **源码安装** 开发 | 想开发插件、阅读源码、参与贡献 | 本地仓库 + 完整构建产物，可用 `pnpm dsh` 直接运行 TypeScript 入口 |
| **Python SDK** 程序化 | 想在自己的 Python 程序中调用 Agent | `deepseek_harness` 包 + 内置运行时，无需系统 Node.js |
## 方式一：npm 一键安装（推荐）
安装 Node.js 后，在终端执行：
```
npx @deepseek-ai/dsh web
```
命令会启动 Web UI，首次运行会自动初始化 `web` 配置模板，然后打印访问地址——**默认是 `http://127.0.0.1:3080`**。
![](/minimal-blog/assets/dsh-tut/dsh-12.webp)
**验证是否成功：**
1. 在浏览器打开终端打印的地址（默认 `http://127.0.0.1:3080`）；
2. 看到 DeepSeek Harness 的 Web 界面即安装成功；
3. 注意：新 Web UI 在添加工作区之前不会选中任何工作区——这是正常现象，下一步会配置。
