# Draw and Guess（你画我猜）

一个基于 Next.js（App Router）+ Canvas 的画图识别/猜词小应用：在画布上作画，选择推理模式，让 AI 猜你画的是什么。

## 功能

- 画布绘制：画笔/橡皮擦、颜色与粗细、撤销、清空、随机题目
- 三种推理模式：`ollama` / `api` / `simultaneous`（同时对比）
- 可配置接口：Gemini（`...:generateContent`）与 OpenAI 兼容接口（OpenAI/Moonshot 等的 `.../chat/completions`）
- 本地保存：设置与识别记录保存在浏览器 `localStorage`

## 快速开始

```bash
npm install
npm run dev
```

打开 `http://localhost:3000`

## 模式与配置

在页面右上角“设置”中配置。

### Ollama 模式

1. 安装并启动 Ollama（默认 `http://localhost:11434`）
2. 拉取一个支持图片输入的模型（示例）：

```bash
ollama pull llava
```

3. 在设置里填写：

- `Ollama服务器地址`：`http://localhost:11434`
- `模型名称`：例如 `llava`

### API 模式（Gemini / OpenAI 兼容）

本项目通过 Next.js 的 `/api/proxy` 代转请求以规避浏览器跨域限制，并对目标域名做了白名单限制（见 `app/api/proxy/route.ts`）。

- Gemini：
  - `API URL`：`https://generativelanguage.googleapis.com/v1beta/models`
  - `模型名称`：例如 `gemini-1.5-flash`
  - `API Key`：必填（以 `x-goog-api-key` 传递）
- OpenAI 兼容（OpenAI/Moonshot 等）：
  - `API URL`：`https://api.openai.com/v1/chat/completions` 或 `https://api.moonshot.cn/v1/chat/completions`
  - `模型名称`：填写对应的视觉模型
  - `API Key`：必填（以 `Authorization: Bearer ...` 传递）

如需调用其他域名，请将目标域名加入 `app/api/proxy/route.ts` 的 `ALLOWED_HOSTS`。

### 同时模式

并行调用 `Ollama` 与 `API`，用于对比两者输出；默认以 `API` 结果作为主结果（若失败则回退到 Ollama）。

## 常用脚本

- `npm run dev`：开发启动
- `npm run build`：构建
- `npm run start`：生产启动
- `npm run lint`：代码检查
- `npm run server`：启动 `server/index.js` 的演示后端（可选）

## 目录结构

- `app/page.tsx`：主界面、绘图逻辑、三种推理模式调用
- `app/api/proxy/route.ts`：请求转发与域名白名单
- `app/components/SettingsModal.tsx`：设置弹窗
- `lib/models/imageClassifier.ts`：TensorFlow.js MobileNet 封装（目前未在 UI 中接入，可按需扩展）
- `lib/stats/index.ts`：本地记录与简单统计（localStorage）
- `server/index.js`：Express 演示后端（内存存储，提供 `/health`、`/api/record`、`/api/history`）

## 安全提示

- API Key 会存储在浏览器 `localStorage`，并会随请求经过本地 Next.js 服务的 `/api/proxy`；如需部署到公网，请自行完善鉴权、密钥管理与代理白名单策略。


