"""DeepL 翻译实现"""
import asyncio
from app.services.translate.base import TranslateService

try:
    import deepl
    DEEPL_AVAILABLE = True
except ImportError:
    DEEPL_AVAILABLE = False


class DeepLTranslateService(TranslateService):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self._translator = None

    def _get_translator(self):
        if self._translator is None and DEEPL_AVAILABLE and self.api_key:
            self._translator = deepl.Translator(self.api_key)
        return self._translator

    async def translate(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        if not text.strip():
            return ""
        if not DEEPL_AVAILABLE or not self.api_key:
            return f"[DeepL 未配置，请设置 DEEPL_API_KEY] {text}"
        translator = self._get_translator()
        result = await asyncio.to_thread(
            translator.translate_text, text, target_lang=target_lang.upper()
        )
        return result.text
