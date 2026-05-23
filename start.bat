@echo off
setlocal

set ROOT=%~dp0

:: Check for .env
if not exist "%ROOT%backend\.env" (
  echo ERROR: backend\.env not found.
  echo Create it with ANTHROPIC_API_KEY=sk-ant-...
  exit /b 1
)

:: --- Backend ---
cd /d "%ROOT%backend"
if not exist ".venv\" (
  echo [backend] Creating virtual environment...
  python -m venv .venv
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
alembic upgrade head
start "PF2e Backend" cmd /c "uvicorn app.main:app --reload --port 8000"

:: --- Frontend ---
cd /d "%ROOT%frontend"
if not exist "node_modules\" (
  echo [frontend] Installing dependencies...
  npm install
)
start "PF2e Frontend" cmd /c "npm run dev"

echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API docs: http://localhost:8000/docs
echo.
echo Both servers started in separate windows. Close them to stop.
