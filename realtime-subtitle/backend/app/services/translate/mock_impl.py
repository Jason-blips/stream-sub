"""Mock 翻译：用于开发测试"""
from app.services.translate.base import TranslateService


class MockTranslateService(TranslateService):
    async def translate(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        if not text.strip():
            return ""
        return f"[Mock] {text} -> 目标语言: {target_lang}"
