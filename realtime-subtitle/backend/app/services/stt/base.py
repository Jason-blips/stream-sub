"""STT 服务接口"""
from abc import ABC, abstractmethod


class STTService(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes, language: str = "auto") -> str:
        """将音频转为文字"""
        pass
