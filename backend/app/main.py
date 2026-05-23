from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.models import knowledge, combat  # noqa: F401 — registers models for Alembic
from app.database import Base
from app.routers import knowledge as knowledge_router, combat as combat_router

Base.metadata.create_all(bind=engine)
settings.ensure_dirs()

app = FastAPI(title="Pathfinder DM Helper", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(knowledge_router.router)
app.include_router(combat_router.router)


@app.get("/health")
def health():
    return {"status": "ok"}
