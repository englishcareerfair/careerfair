@echo off
setlocal
echo Starting VoiceForge Local Inference Engine (127.0.0.1:8765)...
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)
python -m services.inference.server
pause
