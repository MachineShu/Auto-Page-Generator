# Auto Page Generator

这是一个基于 Next.js 的批量内页文案生成工具。

项目目的不是做通用聊天，而是通过第三方大模型接口，批量生成站点内页、工具页、落地页等场景需要的文案内容。页面里支持多模块并发填写与生成，便于同时产出多组内页文案。

## 项目定位

- 调用第三方 OpenAI 兼容接口
- 批量生成内页文案
- 支持标题、metadata、大纲、正文的分阶段生成
- 支持多模块并发处理

## 当前页面能力

- 一个模块由“输入区 + 工作流结果”组成
- 输入区和工作流结果都支持收拢/展开
- 当前最多支持 10 个并发模块
- 第一步生成标题候选与 metadata
- 用户选择标题后，第二步自动串行执行大纲与正文生成

## 接口方式

项目当前固定使用第三方综合服务商的 OpenAI 兼容接口：

- 文档地址：`https://5vm8vsh4qz.apifox.cn/`
- 基础地址：`https://api.guijiapi.net/v1`
- 聊天补全：`POST /chat/completions`
- 模型列表：`GET /models`

## 代码说明

- `app/page.tsx`
  主要负责前端页面、工作流逻辑、并发模块状态，以及提示词内容的维护与修改。
- `scripts/mid-result-server.mjs`
  本地开发时用于保存每个模块的输入、输出和中间结果。

如果后续要调整生成策略、输出格式、关键词命中要求、标题格式、H1/H2/H3 文案形式，主要就是改 `app/page.tsx` 里的提示词。

## 本地开发

```bash
npm install
npm run dev:mid-result
npm run dev
```

本地开发环境下，页面会把每个模块的大模型请求输入、输出和阶段结果保存到：

```bash
mid-result/日期+随机数/
```

每次保存的内容包括：

- 当前模块输入
- 当前阶段请求体
- 当前阶段模型返回
- 当前模块结果快照

## 构建与部署

```bash
npm run build
```

构建后静态文件输出到 `out/`，可直接部署到 Cloudflare Pages。

- Build command: `npm run build`
- Build output directory: `out`

## 备注

- API Key 保存在浏览器本地与 cookie 中，不写入代码。
- 不需要环境变量。
- 所有模型请求都在浏览器端直接发往第三方服务商接口。
