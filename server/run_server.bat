@echo off
title AI Language Tutor - Local Backend Server

echo ===================================================
echo   AI Language Tutor Local Backend Server Started
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking virtual environment...
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt -q

echo.
echo [2/3] Starting FastAPI server (main.py) in background...
start "FastAPI Server" cmd /k "call venv\Scripts\activate.bat && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo.
echo [3/3] Starting Cloudflare tunnel...
if not exist "cloudflared.exe" (
    echo Downloading cloudflared...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

echo.
echo ******************************************************
echo Please copy the URL starting with https://....trycloudflare.com
echo and paste it into the Web App Settings (Gear Icon)
echo ******************************************************
echo.
cloudflared.exe tunnel --url http://127.0.0.1:8000

pause
