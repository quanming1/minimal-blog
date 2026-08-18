---
title: DeepSeek Harness 模型配置
date: '2026-08-18'
description: DeepSeek Harness 模型配置——DeepSeek Harness 教程专栏（转载）
column: DeepSeek Harness 教程
tags: [DeepSeek Harness, dsh, 教程, 转载]
---
> 本文转载自[菜鸟教程 DeepSeek Harness 专栏](https://www.runoob.com/deepseek-harness/deepseek-harness-model-providers.html)，仅作学习备份，版权归原作者所有。
# DeepSeek Harness 模型配置
DeepSeek Harness 可以使用 DeepSeek 官方的配置，也可以使用第三方模型。
| 提供方类型 | 是什么 | 凭据要求 | 适用场景 |
| --- | --- | --- | --- |
| **DeepSeek** | DeepSeek 官方端点 | DeepSeek API 密钥（只写） | 默认、最快上手 |
| **目录提供方** | 已安装目录里的提供方，如 Anthropic、OpenAI | 各家 API 密钥；原生认证的需各自凭据 | 接入已收录的主流厂商 |
| **自定义提供方** | 自建端点，如公司网关、自建服务器 | Provider ID、baseURL、协议、凭据、模型 | 目录里没有的端点 |
打开 http://127.0.0.1:3080/，整个界面如下，我们可以先点击设置配置 API key：
![](https://www.runoob.com/wp-content/uploads/2026/08/dsh-4.webp)
如果你还没有 API 可以，可以去 [https://platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) 申请。
接着打开设置 → 模型，DeepSeek 卡片上有一个 API 密钥输入框，填完保存即可。
![](https://www.runoob.com/wp-content/uploads/2026/08/dsh-5.webp)
## 添加目录提供方
目录提供方由 dsh 的已安装目录提供端点、协议和模型列表。
选择添加提供方，选取 Anthropic 或 OpenAI 等提供方，输入其 API 密钥并保存。
已安装目录会自动带来端点、协议和模型列表，不需要你手填。
使用原生认证的提供方需要各自的原生凭据，只填 API 密钥字段无法完成配置。
| 提供方 | 需要的原生凭据 |
| --- | --- |
| **Bedrock** | AWS 凭据与区域 |
| **Vertex** | ADC 项目 |
| **Azure** | api-version |
| **Codex** | OAuth |
## 添加自定义提供方
公司网关、自建服务器等目录中不存在的端点，用自定义提供方接入。
选择添加自定义提供方，填写下列字段。
![](https://www.runoob.com/wp-content/uploads/2026/08/providers-custom-form.zh_.png)
| 字段 | 说明 | 是否必填 |
| --- | --- | --- |
| **Provider ID** | 小写，永久标识 | 必填 |
| **显示名称** | 在界面里显示的名字 | 可选 |
| **基础 URL** | 端点的 baseURL | 必填 |
| **API 协议** | 如 openai-completions | 必填 |
| **凭据** | API 密钥或环境变量引用 | 必填 |
| **模型** | 至少一个模型 | 必填 |
Provider ID 是永久的，因为请求、已保存会话、模型默认值和凭据引用都会使用它。
如需重命名提供方，请添加新提供方并删除旧提供方。
显示名称、基础 URL、协议、凭据和模型仍可编辑。
在模型目录中选择获取可用模型，可查询表单当前显示的基础 URL 和凭据。
选择候选项只会更新草稿，保存前不会存储提供方。
目录提供方使用已安装目录，不发起网络请求。
## 图片输入：给视觉模型声明模态
手动录入的模型默认按纯文本对待，要支持图片必须显式声明。
因为没有任何环节能去询问端点接受哪些模态，所以 dsh 采取"先声明后使用"的策略。
给这类模型附加图片，会在发送前就被拒绝，并点名该模型。
自定义提供方下的视觉模型需要加一行，表单没有对应字段。
请在 $DSH_HOME/settings.yaml 中给该模型加上 input。
```

# 文件路径：$DSH_HOME/settings.yaml
# 顶层键 llm-pi-ai 是模型路由插件的 id，providers 下按提供方 id 组织
llm-pi-ai:
  providers:
    my-gateway:
      apiKeyEnv: GATEWAY_API_KEY          # 凭据引用：从 GATEWAY_API_KEY 环境变量读取
      api: openai-completions             # API 协议：OpenAI 兼容的补全协议
      baseURL: https://gateway.runoob.example/v1  # 你的网关端点
      models:
        - id: legacy-chat                 # 纯文本模型，不写 input 即按纯文本对待
        - id: vision-preview              # 视觉模型
          input: [text, image]            # 声明同时接受文本与图片
```
input 接受 text 和 image，且只作用于该模型，因此一条路由可以同时服务两类模型。
省略它，或写成空列表，两者同义。
此时保留已安装目录为该模型记录的模态；目录未描述的模型则回退到该路由的 defaultInput。
如果你手动录入的模型全都接受图片，可以在路由上设置一次回退值。
```

# 文件路径：$DSH_HOME/settings.yaml
# defaultInput 是回退值而不是覆盖值，默认为 [text]
llm-pi-ai:
  providers:
    vision-gateway:
      apiKeyEnv: GATEWAY_API_KEY
      api: openai-completions
      baseURL: https://vision.runoob.example/v1
      defaultInput: [text, image]         # 对本路由下目录未描述的模型生效
      models:
        - id: first-model
        - id: second-model
```
要收窄目录提供方中某个模型的模态，写在 modelOverrides 下，以模型 id 为键。
```

# 文件路径：$DSH_HOME/settings.yaml
# 目录提供方没有可填写的 models 列表，覆盖走 modelOverrides
llm-pi-ai:
  providers:
    anthropic:
      modelOverrides:
        claude-sonnet-4-5:
          input: [text]                   # 把该模型的图片能力去掉
```
input 与 defaultInput 都是对你端点的断言，而不是对它的检查。
声明了端点并不提供的图片能力的模型，不会在这里被拦下，改由提供方拒绝该请求。
## 排错表
模型配置出错时，dsh 会给出明确的错误信息，对照下表排查。
| 错误 | 含义 | 解决 |
| --- | --- | --- |
| **MISSING_CREDENTIAL** | 缺少提供方密钥 | 通过模型页存储提供方密钥，或提供被引用的环境变量 |
| **UNKNOWN_MODEL** | 请求的模型未配置 | 选择已配置的模型，或向自定义提供方添加缺失的模型 |
| **获取可用模型返回 401** | 密钥无效，或端点不支持模型发现 | 检查密钥；模型发现调用 OpenAI 兼容的 GET /models，不提供该端点的服务请手动输入模型 |
| **图片在发送前被拒绝** | 模型未声明图片模态 | 给自定义提供方的模型加 input: [text, image]；DeepSeek 自身路由纯文本，无法通过配置改变 |
| **提供方拒绝了带图片的请求** | 模型声明了端点实际并不提供的图片能力 | 从授予它图片能力的列表中移除 image，并开启新会话 |
