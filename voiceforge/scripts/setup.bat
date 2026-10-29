@echo off
setlocal
echo ============================================================
echo   VoiceForge — Offline-First AI Voice Studio Setup (Windows)
echo ============================================================

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10+ from python.org and add it to PATH.
    pause
    exit /b 1
)

echo [1/3] Creating Python virtual environment (.venv)...
if not exist ".venv" (
    python -m venv .venv
)

echo [2/3] Activating virtual environment...
call .venv\Scripts\activate.bat

echo [3/3] Installing lightweight dependencies...
python -m pip install --upgrade pip
pip install -r services\inference\requirements.txt

echo.
echo ============================================================
echo   VoiceForge setup completed successfully!
echo   Run 'scripts\start_inference.bat' to launch the local engine.
echo   Run 'scripts\start_web.bat' to launch the Studio interface.
echo ============================================================
pause
