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

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8765
```

### 扩展

1. 打开 Chrome 扩展管理页面 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」，选择 `extension` 目录

## 环境变量

见 `backend/.env.example`。
