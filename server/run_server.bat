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
echo [3/3] Starting Ngrok with Static Domain...
if not exist "ngrok.exe" (
    echo Downloading Ngrok...
    powershell -Command "Invoke-WebRequest -Uri 'https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip' -OutFile 'ngrok.zip'"
    powershell -Command "Expand-Archive -Path 'ngrok.zip' -DestinationPath '.' -Force"
    del ngrok.zip
)

echo Configuring Ngrok Authtoken...
ngrok.exe config add-authtoken 3JddwJl75QgpT48lDpWg5RJXJB3_7T6ErXxd57LCJdEPvr25N

echo.
echo ******************************************************
echo ALL SET! Your permanent static server address is:
echo https://overexert-swiftly-endeared.ngrok-free.dev
echo ******************************************************
echo.
ngrok.exe http --domain=overexert-swiftly-endeared.ngrok-free.dev 8000

pause
