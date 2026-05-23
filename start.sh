#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# --- Backend ---
if [ ! -f "$ROOT/backend/.env" ]; then
  echo "ERROR: backend/.env not found."
  echo "Create it with: ANTHROPIC_API_KEY=sk-ant-..."
  exit 1
fi

cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  echo "[backend] Creating virtual environment..."
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!

# --- Frontend ---
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  echo "[frontend] Installing dependencies..."
  npm install
fi
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
