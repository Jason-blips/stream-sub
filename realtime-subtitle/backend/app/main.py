"""FastAPI 入口，提供 WebSocket 与健康检查"""
import logging
from app.config import STT_PROVIDER, TRANSLATE_PROVIDER
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.websocket.handler import handle_websocket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Realtime Subtitle API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "stt": STT_PROVIDER, "translate": TRANSLATE_PROVIDER}


@app.on_event("startup")
def startup():
    from app.services.factory import get_stt_service, get_translate_service
    stt = get_stt_service()
    trans = get_translate_service()
    logger.info("STT: %s | Translate: %s", type(stt).__name__, type(trans).__name__)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await handle_websocket(websocket)
