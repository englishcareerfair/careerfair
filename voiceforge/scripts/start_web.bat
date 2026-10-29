@echo off
setlocal
echo ============================================================
echo   Launching VoiceForge Studio Interface (http://localhost:3000)
echo ============================================================
start "" "http://localhost:3000"
python -m http.server 3000 --directory apps\web\public
pause
