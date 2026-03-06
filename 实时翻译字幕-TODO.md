# 会议实时翻译字幕 - TODO List

> 创意 #3：为 Zoom、Teams 等会议提供实时多语言字幕

---

## 实现清单

| # | 任务 | 状态 |
|---|------|------|
| 1 | 项目初始化：创建目录结构、依赖、基础配置 | ✅ 完成 |
| 2 | 后端：FastAPI 服务骨架 + WebSocket 端点 | ⬜ 待办 |
| 3 | 后端：集成 STT（Whisper/云 API）音频转文字 | ⬜ 待办 |
| 4 | 后端：集成翻译 API（DeepL/Google） | ⬜ 待办 |
| 5 | 后端：音频流接收 → STT → 翻译 → WebSocket 推送 | ⬜ 待办 |
| 6 | 前端：浏览器扩展 - 捕获 Tab 音频（WebRTC/getDisplayMedia） | ⬜ 待办 |
| 7 | 前端：字幕悬浮层 UI + 设置面板 | ⬜ 待办 |
| 8 | 前端：WebSocket 连接 + 实时字幕展示 | ⬜ 待办 |
| 9 | 联调与优化：延迟、错误处理、多语言切换 | ⬜ 待办 |
| 10 | 文档：README、环境变量、使用说明 | ⬜ 待办 |

---

## 技术栈速查

| 层级 | 选型 |
|------|------|
| STT | Whisper / Azure Speech / 讯飞 |
| 翻译 | DeepL API / Google Translate API |
| 音频捕获 | WebRTC / getDisplayMedia |
| 流式传输 | WebSocket |
| 前端 | React + TypeScript（浏览器扩展） |
| 后端 | Python (FastAPI) |

---

## 建议实现顺序

1. **先做后端**：FastAPI + WebSocket + Mock STT/翻译，验证链路
2. **再做扩展**：Manifest V3 扩展骨架 + 音频捕获 + 连接后端
3. **最后联调**：真实 API、延迟优化、多语言
