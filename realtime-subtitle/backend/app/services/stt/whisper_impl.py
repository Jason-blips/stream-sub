"""Whisper 实现：本地语音转文字，支持 webm 格式"""
import asyncio
import os
import tempfile
from app.services.stt.base import STTService

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False


class WhisperSTTService(STTService):
    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None and WHISPER_AVAILABLE:
            self._model = whisper.load_model(self.model_name)
        return self._model

    async def transcribe(self, audio_bytes: bytes, language: str = "auto") -> str:
        if not WHISPER_AVAILABLE:
            return ""
        if len(audio_bytes) < 100:
            return ""
        model = self._get_model()
        if model is None:
            return ""
        # Whisper 通过 ffmpeg 支持 webm，直接保存为 webm
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            path = f.name
        try:
            lang = None if language == "auto" else language
            result = await asyncio.to_thread(model.transcribe, path, language=lang)
            return result.get("text", "").strip()
        except Exception:
            return ""
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
