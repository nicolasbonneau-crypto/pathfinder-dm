from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime


class BookOut(BaseModel):
    id: str
    filename: str
    title: str
    page_count: int
    indexed_at: datetime

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []


class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    has_context: bool = True
