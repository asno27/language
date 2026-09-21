@echo off
chcp 65001 >nul
title AI Language Tutor - Local Backend Server

echo ===================================================
echo   AI Language Tutor 로컬 백엔드 서버 시작
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] 가상환경 활성화 및 패키지 확인 중...
if not exist "venv" (
    echo 가상환경(venv)이 없습니다. 처음 설치를 진행합니다.
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt -q

echo.
echo [2/3] FastAPI 서버(main.py)를 백그라운드에서 실행합니다...
start "FastAPI Server" cmd /c "uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [3/3] Ngrok 터널링을 시작합니다...
echo (주의: ngrok.exe가 설치되어 있고 환경 변수에 등록되어 있어야 합니다.)
echo (만약 ngrok이 설치되어 있지 않다면 창을 닫고 FastAPI 서버만 사용하셔도 됩니다.)
echo.
ngrok http 8000

pause
