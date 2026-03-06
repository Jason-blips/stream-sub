"""服务工厂：根据配置创建 STT 和翻译实例"""
from app.config import (
    STT_PROVIDER,
    WHISPER_MODEL,
    TRANSLATE_PROVIDER,
    DEEPL_API_KEY,
)
from app.services.stt.base import STTService
from app.services.stt.mock_impl import MockSTTService
from app.services.stt.whisper_impl import WhisperSTTService
from app.services.translate.base import TranslateService
from app.services.translate.mock_impl import MockTranslateService
from app.services.translate.deepl_impl import DeepLTranslateService
from app.services.translate.google_impl import GoogleTranslateService


def get_stt_service() -> STTService:
    if STT_PROVIDER == "whisper":
        try:
            import whisper
            return WhisperSTTService(model_name=WHISPER_MODEL)
        except ImportError:
            return MockSTTService()
    return MockSTTService()


def get_translate_service() -> TranslateService:
    if TRANSLATE_PROVIDER == "deepl" and DEEPL_API_KEY:
        return DeepLTranslateService(api_key=DEEPL_API_KEY)
    if TRANSLATE_PROVIDER == "google":
        try:
            from googletrans import Translator
            return GoogleTranslateService()
        except ImportError:
            return MockTranslateService()
    return MockTranslateService()
