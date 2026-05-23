# Backend CLAUDE.md

## Stack

- **FastAPI** — async web framework, auto OpenAPI docs at `http://localhost:8000/docs`
- **SQLAlchemy 2.0** — ORM with mapped columns
- **Alembic** — database migrations
- **SQLite** — local database (`pathfinder_dm.db`)
- **LlamaIndex** — RAG pipeline orchestration
- **ChromaDB** — local vector store for embeddings
- **HuggingFace bge-small-en-v1.5** — embedding model (runs locally, no API key needed)
- **Anthropic SDK** — LLM calls (claude-sonnet-4-6 for chat, claude-haiku for fast lookups)
- **Pydantic v2** — request/response schemas and settings

## Directory Layout

```
app/
├── main.py          # FastAPI app, CORS, router registration, table creation
├── config.py        # Settings (reads .env via pydantic-settings)
├── database.py      # Engine, SessionLocal, Base, get_db dependency
├── models/
│   ├── knowledge.py # Book ORM model
│   └── combat.py    # Encounter + Combatant ORM models
├── schemas/
│   ├── knowledge.py # BookOut, ChatRequest, ChatResponse
│   └── combat.py    # EncounterOut, CombatantOut, MonsterCardOut, …
├── routers/
│   ├── knowledge.py # /api/knowledge/* endpoints
│   └── combat.py    # /api/combat/* endpoints
└── services/
    ├── rag_service.py     # LlamaIndex PDF indexing + querying
    ├── combat_service.py  # Encounter/combatant business logic
    └── monster_service.py # Claude-powered monster stat block lookup
```

## Architecture Rules

- **No business logic in routers.** Routers validate input, call a service, return a response. That's it.
- **SQLAlchemy models ≠ Pydantic schemas.** Never pass ORM objects across the API boundary; always serialize via a schema with `model_validate(orm_obj)`.
- **Type hints everywhere.** Use `from __future__ import annotations` at top of every file.
- **Settings only via `app.config.settings`.** Never read env vars directly with `os.environ`.

## Database Migrations

```bash
# Create a new migration after changing a model
alembic revision --autogenerate -m "describe change"

# Apply migrations
alembic upgrade head
```

The app also calls `Base.metadata.create_all()` on startup as a fallback for first-run without Alembic.

## RAG Pipeline

1. **Ingest** (`rag_service.index_pdf`): PDF → LlamaIndex `SimpleDirectoryReader` → chunked `Document` objects → embedded via `bge-small-en-v1.5` → stored in ChromaDB.
2. **Query** (`rag_service.query_rag`): user message → LlamaIndex chat engine with condense + context mode → retrieves relevant chunks from ChromaDB → Claude generates answer with citations.
3. **Delete** (`rag_service.delete_book_chunks`): removes all ChromaDB vectors for a given `book_id`.

Each document chunk carries `book_id` and `source` (filename) metadata so sources can be cited in responses.

## Testing

```bash
cd backend
pytest                    # all tests with coverage
pytest tests/unit/        # unit tests only
pytest tests/integration/ # integration tests only
pytest -k test_name       # run specific test
```

**Rules:**
- Unit tests use an in-memory SQLite database; never touch real ChromaDB or the Anthropic API.
- Integration tests use a TestClient with a function-scoped real SQLite test DB. Mock external calls (`rag_service`, `monster_service`) where the test doesn't cover that layer.
- Tests that call the Anthropic API must be marked `@pytest.mark.integration` and are skipped in CI unless `ANTHROPIC_API_KEY` is set.
- Every new service function gets unit tests. Every new endpoint gets integration tests.

## Environment

`backend/.env` (not committed):
```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./pathfinder_dm.db
CHROMA_PERSIST_DIR=./chroma_db
UPLOAD_DIR=./uploads
```

## Running Locally

```bash
# First time
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head

# Every time
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`
