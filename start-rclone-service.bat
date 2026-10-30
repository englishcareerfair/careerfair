@echo off
title CareerFair Google Drive rclone Bridge
echo ====================================================
echo Starting rclone Remote Control (RC) HTTP Service...
echo Remote: gdrive:careerfair_telemetry
echo Endpoint: http://127.0.0.1:5572
echo Account: tanmaybajaj69@gmail.com
echo ====================================================
"C:\Users\shwet\tools\rclone\rclone.exe" rcd --rc-addr 127.0.0.1:5572 --rc-no-auth --rc-allow-origin="*"
pause
