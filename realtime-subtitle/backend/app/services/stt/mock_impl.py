"""Mock STT：用于开发测试，返回固定文本"""
from app.services.stt.base import STTService


class MockSTTService(STTService):
    async def transcribe(self, audio_bytes: bytes, language: str = "auto") -> str:
        if len(audio_bytes) < 50:
            return ""
        return "这是测试字幕，请接入真实 STT 服务。"
