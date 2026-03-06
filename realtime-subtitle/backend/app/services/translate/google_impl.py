"""Google 翻译实现（deep-translator 免费版，兼容 Python 3.13）"""
import asyncio
from app.services.translate.base import TranslateService

try:
    from deep_translator import GoogleTranslator
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

# 前端简写 -> deep-translator 语言代码
LANG_MAP = {"zh": "zh-CN", "en": "en", "ja": "ja", "ko": "ko", "fr": "fr", "de": "de", "es": "es"}


def _translate_sync(text: str, target_lang: str, source_lang: str = "auto") -> str:
    if not GOOGLE_AVAILABLE:
        return ""
    src = source_lang if source_lang and source_lang != "auto" else "auto"
    target = LANG_MAP.get(target_lang.lower(), target_lang)
    return GoogleTranslator(source=src, target=target).translate(text)


class GoogleTranslateService(TranslateService):
    async def translate(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        if not text.strip():
            return ""
        if not GOOGLE_AVAILABLE:
            return f"[deep-translator 未安装] {text}"
        return await asyncio.to_thread(_translate_sync, text, target_lang, source_lang)
