@echo off
title AutoTube Factory — Docker Launcher
color 0A

echo.
echo  =====================================================
echo   AutoTube Factory — One-Click Docker Launcher
echo  =====================================================
echo.

REM ── Check Docker is installed ──────────────────────────────────────────────
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Docker is not installed or not running.
    echo.
    echo  Please install Docker Desktop from:
    echo  https://www.docker.com/products/docker-desktop/
    echo.
    echo  After installing, start Docker Desktop and run this script again.
    echo.
    pause
    exit /b 1
)

REM ── Check .env.local exists ────────────────────────────────────────────────
if not exist ".env.local" (
    echo  [SETUP] No .env.local found — creating from template...
    copy ".env.example" ".env.local" >nul
    color 0E
    echo.
    echo  ================================================================
    echo   FIRST-TIME SETUP
    echo.
    echo   To get started immediately (FREE, no credit card):
    echo.
    echo   1. Go to https://console.groq.com  and create a free account
    echo   2. Generate an API key  (starts with gsk_...)
    echo   3. Open .env.local (opening now) and paste it:
    echo.
    echo        GROQ_API_KEY=gsk_your_key_here
    echo.
    echo   That's all! Images use Pollinations.ai (zero setup).
    echo.
    echo   Optional extras:
    echo     Google AI (free):  aistudio.google.com  →  AIza...
    echo     AWS Bedrock:       Add AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY
    echo     Notion/Slack/Airtable: See .env.local for details
    echo.
    echo   After editing .env.local, run START.bat again.
    echo  ================================================================
    echo.
    echo  Opening .env.local in Notepad now...
    notepad .env.local
    pause
    exit /b 0
)

REM ── Build ──────────────────────────────────────────────────────────────────
echo  [1/3] Building Docker image...
echo        (First run takes 2-3 minutes — grabbing Node, Python, fonts)
echo.
docker compose build --quiet
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Docker build failed. Check that Docker Desktop is running.
    echo          Run "docker compose build" to see the full error.
    pause
    exit /b 1
)

REM ── Start ──────────────────────────────────────────────────────────────────
echo.
echo  [2/3] Starting AutoTube Factory...
docker compose up -d
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Failed to start. Run "docker compose up" to see details.
    pause
    exit /b 1
)

echo.
echo  [3/3] Waiting for app to be ready (15 seconds)...
timeout /t 15 /nobreak >nul

REM ── Open browser ───────────────────────────────────────────────────────────
echo.
color 0A
echo  =====================================================
echo   AutoTube Factory is running!
echo.
echo   Open in browser:  http://localhost:3001
echo.
echo   Stop the app:     STOP.bat  (or double-click STOP.bat)
echo   View logs:        docker compose logs -f
echo   Restart + update: docker compose down ^&^& START.bat
echo  =====================================================
echo.

start "" "http://localhost:3001"

echo  Press any key to follow the live logs (Ctrl+C to detach)...
pause >nul
docker compose logs -f
