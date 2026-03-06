"""Whisper 实现：本地语音转文字（需安装 openai-whisper 或 faster-whisper）"""
import io
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
            return "[Whisper 未安装，请 pip install openai-whisper]"
        model = self._get_model()
        if model is None:
            return ""
        # Whisper 需要 wav 格式，假设传入为 raw pcm 或 wav
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(audio_bytes)
            path = f.name
        try:
            import asyncio
            lang = None if language == "auto" else language
            result = await asyncio.to_thread(model.transcribe, path, language=lang)
            return result.get("text", "").strip()
        finally:
            import os
            os.unlink(path)
