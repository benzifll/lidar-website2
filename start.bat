@echo off
title LiDAR Web Dashboard Launcher
echo ===================================================
echo     Starting LiDAR Web Dashboard Services...
echo ===================================================
echo.

echo Cleaning up old background processes...
taskkill /F /IM "python.exe" /T >nul 2>&1
taskkill /F /IM "node.exe" /T >nul 2>&1
echo Old processes terminated!
echo.

echo [1/2] Starting Python Backend...
start "LiDAR Backend Server" cmd /k "cd backend && pip install -r requirements.txt && python server.py"

echo [2/2] Starting Next.js Frontend...
start "LiDAR Frontend Server" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ===================================================
echo Both services have been launched in separate windows!
echo.
echo The backend is attempting to connect to the LiDAR on USB.
echo The frontend will be available at: http://localhost:3000
echo ===================================================
echo.
pause
