"""应用配置，从环境变量读取"""
import os
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

# WebSocket
WS_HOST = os.getenv("WS_HOST", "0.0.0.0")
WS_PORT = int(os.getenv("WS_PORT", "8765"))

# STT（语音转文字）mock=测试用 | whisper=真实识别
STT_PROVIDER = os.getenv("STT_PROVIDER", "mock")
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")

# 翻译（mock=Mock, google=googletrans 免费, deepl=需 API Key）
TRANSLATE_PROVIDER = os.getenv("TRANSLATE_PROVIDER", "google")
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")
