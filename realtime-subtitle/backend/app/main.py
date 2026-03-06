"""FastAPI 入口，提供 WebSocket 与健康检查"""
from app.config import STT_PROVIDER
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.websocket.handler import handle_websocket

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
    return {"status": "ok", "stt": STT_PROVIDER}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await handle_websocket(websocket)
