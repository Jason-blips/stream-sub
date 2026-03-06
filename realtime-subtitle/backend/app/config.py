"""应用配置，从环境变量读取"""
import os

# WebSocket
WS_HOST = os.getenv("WS_HOST", "0.0.0.0")
WS_PORT = int(os.getenv("WS_PORT", "8765"))

# STT（语音转文字）
STT_PROVIDER = os.getenv("STT_PROVIDER", "whisper")  # whisper | azure | xunfei
WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")

# 翻译
TRANSLATE_PROVIDER = os.getenv("TRANSLATE_PROVIDER", "deepl")  # deepl | google
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")
GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "")
