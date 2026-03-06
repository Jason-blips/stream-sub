"""启动后端服务"""
import uvicorn
from app.config import WS_HOST, WS_PORT

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=WS_HOST, port=WS_PORT, reload=True)
