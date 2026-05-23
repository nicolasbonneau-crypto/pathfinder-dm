@echo off
setlocal

set ROOT=%~dp0

echo =============================================
echo  Pathfinder 2e DM Helper - Startup
echo =============================================
echo.

:: --- Preflight checks ---

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python not found.
  echo   Install Python 3.11+ from https://www.python.org/downloads/
  echo   Make sure to tick "Add Python to PATH" during install.
  pause & exit /b 1
)

:: Warn if Python is the Windows Store stub
python -c "import sys; exit(0 if sys.executable and 'WindowsApps' not in sys.executable else 1)" >nul 2>&1
if errorlevel 1 (
  echo [WARNING] Python resolves to the Windows Store stub ^(WindowsApps\python.exe^).
  echo   This can cause venv creation to fail.
  echo   Install Python from https://www.python.org/downloads/ for best results.
  echo.
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo   Install Node.js 20+ from https://nodejs.org/
  echo   Restart this script after installing.
  pause & exit /b 1
)

:: Check npm
npm --version >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Reinstall Node.js from https://nodejs.org/
  pause & exit /b 1
)

:: Check .env
if not exist "%ROOT%backend\.env" (
  echo [ERROR] backend\.env not found.
  echo   Copy backend\.env.example to backend\.env
  echo   and set your ANTHROPIC_API_KEY.
  pause & exit /b 1
)

echo [OK] All prerequisites found.
echo.

:: --- Backend setup ---
cd /d "%ROOT%backend"

if not exist ".venv\" (
  echo [backend] Creating virtual environment...
  python -m venv .venv
  if errorlevel 1 (
    echo [ERROR] Failed to create Python virtual environment.
    pause & exit /b 1
  )
)

echo [backend] Installing Python dependencies ^(this may take a while on first run^)...
call .venv\Scripts\activate.bat
pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] pip install failed. Check the output above.
  pause & exit /b 1
)

echo [backend] Running database migrations...
alembic upgrade head
if errorlevel 1 (
  echo [ERROR] alembic upgrade failed. Check the output above.
  pause & exit /b 1
)

:: Launch backend in its own window that stays open on error
echo [backend] Starting server on http://localhost:8000 ...
start "PF2e Backend" cmd /k "cd /d "%ROOT%backend" && call .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

:: --- Frontend setup ---
cd /d "%ROOT%frontend"

if not exist "node_modules\" (
  echo [frontend] Installing Node dependencies ^(this may take a while on first run^)...
  npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed. Check the output above.
    pause & exit /b 1
  )
)

:: Launch frontend in its own window that stays open on error
echo [frontend] Starting dev server on http://localhost:5173 ...
start "PF2e Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo.
echo =============================================
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API docs: http://localhost:8000/docs
echo =============================================
echo.
echo Both servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause
