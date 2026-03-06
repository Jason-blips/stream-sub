"""启动后端服务"""
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).resolve().parent / ".env")

import uvicorn
from app.config import WS_HOST, WS_PORT

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=WS_HOST, port=WS_PORT, reload=True)
