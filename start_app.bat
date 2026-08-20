@echo off
echo ==================================================
echo   SMART ACADEMIC FEEDBACK ^& ANALYTICS SYSTEM (SAFAS)
echo ==================================================
echo.

echo [1/3] Starting FastAPI Backend on port 8000...
start "SAFAS Backend Server" cmd /k "cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload"

echo [2/3] Starting Frontend Web Server on port 5500...
start "SAFAS Frontend Server" cmd /k "cd frontend && python -m http.server 5500"

echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo.
echo Launching your web browser...
start http://localhost:5500

echo.
echo ==================================================
echo   SAFAS is now running!
echo   Close the two new terminal windows to stop the servers.
echo ==================================================
pause
