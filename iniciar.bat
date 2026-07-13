@echo off
start "TradeTec Backend" cmd /k "cd /d C:\tradetec\backend && python -m uvicorn main:app --reload --port 8000"
timeout /t 3 /nobreak >nul
start "TradeTec Frontend" cmd /k "cd /d C:\tradetec\frontend && npm run dev"
timeout /t 5 /nobreak >nul
start http://localhost:5173
