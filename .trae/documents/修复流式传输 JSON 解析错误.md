# 修复流式传输 JSON 解析错误

## 问题
流式传输时，JSON 对象可能被分割到多个数据块，导致 `JSON.parse()` 失败。

## 解决方案

### 1. 修改 `evaluateWithOlla` 函数
- 添加缓冲区 `buffer` 来累积不完整的 JSON 数据
- 逐行处理数据，将不完整的行累积到缓冲区
- 当遇到有效的 JSON 时才解析
- 解析成功后清空缓冲区

### 2. 修改 `evaluateWithAPI` 函数
- 对 Ollama 格式应用相同的缓冲区机制
- 对 OpenAI 格式（SSE）也添加缓冲区处理
- 确保跨数据块的 JSON 能正确解析

## 实现细节
- 使用 `buffer` 变量存储不完整的 JSON 字符串
- 在解析前检查 JSON 是否完整（使用 try-catch）
- 解析失败时将数据追加到缓冲区
- 解析成功后清空缓冲区