"""Google 翻译实现（googletrans 免费版）"""
import asyncio
from app.services.translate.base import TranslateService

try:
    from googletrans import Translator
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False


class GoogleTranslateService(TranslateService):
    def __init__(self):
        self._translator = Translator() if GOOGLE_AVAILABLE else None

    async def translate(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        if not text.strip():
            return ""
        if not GOOGLE_AVAILABLE:
            return f"[googletrans 未安装，请 pip install googletrans==4.0.0-rc1] {text}"
        src = source_lang if source_lang != "auto" else None
        result = await asyncio.to_thread(
            self._translator.translate, text, dest=target_lang, src=src
        )
        return result.text
