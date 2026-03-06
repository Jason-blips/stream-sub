@echo off
cd /d "%~dp0"

echo Starting backend...
start "Backend" cmd /k "cd /d %~dp0backend && python run.py"

timeout /t 5 /nobreak >nul

echo Starting desktop app...
start "Desktop" cmd /k "cd /d %~dp0desktop && npm start"

echo.
echo Done. Close windows to stop.
pause
