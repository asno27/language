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
start "FastAPI Server" cmd /k "call venv\Scripts\activate.bat && uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo.
echo [3/3] Cloudflare 터널링을 시작합니다...
if not exist "cloudflared.exe" (
    echo Cloudflared 프로그램을 다운로드합니다...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe'"
)

echo.
echo ******************************************************
echo 잠시 후 화면에 뜨는 주소 (https://....trycloudflare.com) 를
echo 스마트폰 웹 앱의 [설정]에 입력해주세요!
echo ******************************************************
echo.
cloudflared.exe tunnel --url http://127.0.0.1:8000

pause
