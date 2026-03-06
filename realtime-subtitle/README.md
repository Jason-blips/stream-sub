# 会议实时翻译字幕

为 Zoom、Teams 等会议提供实时多语言字幕。

## 目录结构

```
realtime-subtitle/
├── backend/                 # FastAPI 后端
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── websocket/       # WebSocket 处理
│   │   └── services/       # STT、翻译
│   ├── requirements.txt
│   └── .env.example
├── extension/               # 浏览器扩展 (Manifest V3)
│   ├── manifest.json
│   ├── background.js
│   ├── content/
│   ├── popup/
│   └── icons/
└── README.md
```

## 快速开始

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
python run.py
# 或: uvicorn app.main:app --reload --port 8765
```

服务默认运行在 `http://localhost:8765`，WebSocket 端点 `ws://localhost:8765/ws`。

### 2. 安装扩展

1. 打开 Chrome 扩展管理页面 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `realtime-subtitle/extension` 目录

### 3. 使用

1. 打开会议页面（Zoom、Teams、Google Meet 等）
2. 点击扩展图标，选择目标语言，点击「开始捕获」
3. 在弹窗中选择「Chrome 标签页」并选中当前会议标签
4. 字幕将显示在页面底部

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| WS_PORT | 服务端口 | 8765 |
| STT_PROVIDER | STT 服务：mock / whisper | mock |
| TRANSLATE_PROVIDER | 翻译：mock / google / deepl | google |
| DEEPL_API_KEY | DeepL API Key（deepl 时必填） | - |

## 当前实现

- **STT**：默认 Mock，安装 `openai-whisper` 后设置 `STT_PROVIDER=whisper` 可启用
- **翻译**：默认使用 googletrans（免费），可切换 DeepL
