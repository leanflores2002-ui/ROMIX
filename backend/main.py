import logging
import os
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.db.database import init_db
from backend.routers.pedidos import router as pedidos_router


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="[%(asctime)s] [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(title="ROMIX Backend", version="1.0.0")


# CORS
def _parse_origins(s: str) -> List[str]:
    return [o.strip() for o in s.split(",") if o.strip()]


allowed_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:4200,http://localhost:3000,http://127.0.0.1:5500,*,http://localhost",
)

if allowed_origins == "*" or "*" in allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_parse_origins(allowed_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


# Routers
app.include_router(pedidos_router)


# Optional: Uvicorn entrypoint
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "backend.main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("RELOAD", "true").lower() == "true",
    )

