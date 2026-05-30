@echo off
title Hackanizer - Unified Server
color 0A

echo.
echo  =========================================
echo   HACKANIZER - Building ^& Starting App
echo  =========================================
echo.

REM ── Build the React Frontend ────────────────────────────────────
echo [1/2] Building React Frontend (Vite)...
cd /d "%~dp0Frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed! Check npm output above.
    pause
    exit /b 1
)
echo [OK] Frontend built successfully.
echo.

REM ── Start Unified FastAPI Server ────────────────────────────────
echo [2/2] Starting Unified Server (API + Frontend) on http://localhost:8001 ...
cd /d "%~dp0backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001

REM If uvicorn exits, show a message
echo.
echo [INFO] Server stopped.
pause
