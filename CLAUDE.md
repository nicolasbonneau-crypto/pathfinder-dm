# Pathfinder DM Helper — Root CLAUDE.md

## Project Overview

A local web app for Pathfinder 2e Dungeon Masters with two core features:

1. **Knowledge Base (Page 1)** — RAG-powered chatbot over uploaded Pathfinder rulebook PDFs, answered by Claude.
2. **Combat Tracker (Page 2)** — Initiative/HP tracker for players and monsters, plus dynamic monster stat cards queried strictly from the RAG (uploaded rulebooks only).

**Single-user, local deployment.** No authentication. SQLite database. Runs on Mac and Windows.

---

## Architecture

```
pathfinder-dm/
├── frontend/        # React 18 + TypeScript + Vite
├── backend/         # Python FastAPI + SQLAlchemy + LlamaIndex
├── docker-compose.yml
├── start.sh         # Unix startup script
├── start.bat        # Windows startup script
└── CLAUDE.md
```

### Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast HMR, strong typing, great ecosystem |
| Backend | Python FastAPI | Async, great LLM/RAG libs, OpenAPI auto-docs |
| LLM | Claude API (claude-sonnet-4-6) | Best reasoning, used via Anthropic SDK |
| RAG | LlamaIndex + ChromaDB | Local vector store, PDF ingestion, no cloud dependency |
| DB | SQLite + SQLAlchemy + Alembic | Zero-config, cross-platform, migrations |
| Testing | Vitest + RTL + Playwright (FE) / Pytest (BE) | Full coverage: unit → integration → e2e |

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- An Anthropic API key (set as `ANTHROPIC_API_KEY` in `backend/.env`)

### Quick Start (Docker)

```bash
docker-compose up
```

### Manual Start

**Backend:**
```bash
cd backend
python -m venv .venv
# Mac/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

App is available at `http://localhost:5173`. Backend API at `http://localhost:8000`.

---

## Testing Policy

**All new code must have tests.** Test files live alongside the source they test (see per-component CLAUDE.md for details).

| Test type | Frontend | Backend |
|---|---|---|
| Unit | Vitest + React Testing Library | pytest |
| Integration | Vitest (API mocks via MSW) | pytest + httpx (TestClient) |
| E2E | Playwright | Playwright (hitting live backend) |

Run all tests:
```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && pytest

# E2E
cd frontend && npm run test:e2e
```

Tests must pass before committing. CI/CD will enforce this.

---

## Code Conventions

- **No comments unless the WHY is non-obvious.** Well-named identifiers are documentation.
- **No speculative abstractions.** Don't build for hypothetical future requirements.
- **TypeScript strict mode** — no `any`, no `as unknown as`.
- **Python type hints everywhere** — use `from __future__ import annotations`.
- **Pydantic for all API schemas** — never pass raw dicts across the API boundary.
- **SQLAlchemy models ≠ Pydantic schemas** — keep them separate.
- **No business logic in routers** — routers call services; services do the work.

---

## Environment Variables

Backend reads from `backend/.env` (not committed):

```env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///./pathfinder_dm.db
CHROMA_PERSIST_DIR=./chroma_db
UPLOAD_DIR=./uploads
```

Frontend reads from `frontend/.env.local` (not committed):

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## Key Decisions

- **ChromaDB local persistence** — vector store lives on disk next to the backend. No cloud vector DB needed.
- **LlamaIndex** orchestrates RAG: PDF → chunks → embeddings (bge-small-en-v1.5, local) → ChromaDB → retrieval → Claude answer.
- **SQLite** stores combat state (encounters, combatants, HP log) and persists across sessions.
- **No auth** — single-user, local only. If deployed publicly, add auth first.
- **Monster lookup is RAG-only** — stat blocks come strictly from uploaded rulebooks. `LookupError` if the monster is not found; no internet fallback, no training-data hallucination.
- **Library monkey-patches** — `rag_service.py` patches two library bugs at module load: (1) `llama-index-llms-anthropic 0.3.5` doesn't recognise claude-sonnet-4-6; (2) `llama-index-vector-stores-chroma 0.2.1` passes `where={}` which ChromaDB 0.5.x rejects. Do not remove these patches without upgrading both libraries.

---

## Pre-Commit Checklist

Run this before every `git commit`:

```bash
# 1. Backend tests (all must pass)
cd backend && pytest

# 2. Frontend unit + integration tests (all must pass)
cd frontend && npm test

# 3. TypeScript — zero errors
cd frontend && npm run typecheck
```

Then review:
- [ ] No `.env`, `*.db`, SSH keys, or secrets staged (`git diff --cached --name-only`)
- [ ] Legacy code removed — no dead imports, unused variables, or commented-out blocks
- [ ] New components have unit tests; new API endpoints have integration tests
- [ ] CLAUDE.md files reflect any architectural changes made
