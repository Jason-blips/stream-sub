"""WebSocket 连接处理：接收音频 chunk，STT → 翻译 → 推送字幕"""
import base64
import json
import logging
from fastapi import WebSocket

from app.services.factory import get_stt_service, get_translate_service

logger = logging.getLogger(__name__)


def _is_mostly_english(text: str) -> bool:
    """粗略判断文本是否主要为英文"""
    if not text.strip():
        return False
    ascii_count = sum(1 for c in text if ord(c) < 128)
    return ascii_count / max(len(text), 1) > 0.8


async def handle_websocket(websocket: WebSocket):
    await websocket.accept()
    stt = get_stt_service()
    translate = get_translate_service()
    target_lang = "zh"

    try:
        while True:
            data = await websocket.receive()
            text_data = data.get("text")
            bytes_data = data.get("bytes")

            if text_data:
                try:
                    msg = json.loads(text_data)
                    if msg.get("type") == "config":
                        target_lang = msg.get("targetLang", "zh")
                        await websocket.send_json({"type": "config_ok", "targetLang": target_lang})
                        continue
                except json.JSONDecodeError:
                    pass

            audio_bytes = None
            if bytes_data:
                audio_bytes = bytes_data
            elif text_data:
                try:
                    msg = json.loads(text_data)
                    if msg.get("type") == "audio" and msg.get("data"):
                        audio_bytes = base64.b64decode(msg["data"])
                except (json.JSONDecodeError, KeyError):
                    pass

            if audio_bytes and len(audio_bytes) > 50:
                try:
                    logger.info("收到音频 %d 字节", len(audio_bytes))
                    original = await stt.transcribe(audio_bytes)
                    logger.info("STT 结果: %r", original)
                    if original:
                        if target_lang == "en" and _is_mostly_english(original):
                            translated = original
                        else:
                            translated = await translate.translate(original, target_lang)
                        await websocket.send_json({
                            "type": "subtitle",
                            "original": original,
                            "translated": translated,
                        })
                    else:
                        logger.info("STT 返回空（音频 %d 字节），可能无语音或窗口无音频权限", len(audio_bytes))
                except Exception as e:
                    logger.exception("处理音频失败: %s", e)
                    await websocket.send_json({
                        "type": "subtitle",
                        "original": "",
                        "translated": f"错误: {str(e)[:50]}",
                    })

    except Exception as e:
        logger.info("WebSocket 关闭: %s", e)
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
