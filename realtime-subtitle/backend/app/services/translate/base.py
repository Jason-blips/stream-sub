"""翻译服务接口"""
from abc import ABC, abstractmethod


class TranslateService(ABC):
    @abstractmethod
    async def translate(self, text: str, target_lang: str, source_lang: str = "auto") -> str:
        """将文本翻译为目标语言"""
        pass
