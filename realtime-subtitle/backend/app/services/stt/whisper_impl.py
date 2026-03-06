"""Whisper 实现：本地语音转文字，需 ffmpeg 支持 webm"""
import asyncio
import logging
import os
import tempfile
from app.services.stt.base import STTService

logger = logging.getLogger(__name__)

try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False


def _webm_to_wav(webm_path: str) -> str:
    """用 pydub 将 webm 转为 wav，Whisper 兼容性更好"""
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(webm_path, format="webm")
        wav_path = webm_path.replace(".webm", ".wav")
        audio.export(wav_path, format="wav")
        return wav_path
    except Exception as e:
        logger.warning("pydub 转换失败 %s，尝试直接使用 webm", e)
        return webm_path


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
        with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
            f.write(audio_bytes)
            webm_path = f.name
        wav_path = None
        try:
            wav_path = _webm_to_wav(webm_path)
            path_to_use = wav_path if wav_path != webm_path else webm_path
            lang = None
            result = await asyncio.to_thread(model.transcribe, path_to_use, language=lang)
            return result.get("text", "").strip()
        except Exception as e:
            logger.exception("Whisper 转写失败: %s", e)
            return ""
        finally:
            for p in [webm_path, wav_path]:
                if p and os.path.exists(p):
                    try:
                        os.unlink(p)
                    except OSError:
                        pass
