@echo off
title Stop LiDAR Services
echo ===================================================
echo     Stopping LiDAR Web Dashboard Services...
echo ===================================================
echo.

echo [1/2] Stopping Python Backend...
taskkill /FI "WINDOWTITLE eq LiDAR Backend Server*" /T /F >nul 2>&1
taskkill /IM "python.exe" /F /T >nul 2>&1

echo [2/2] Stopping Next.js Frontend...
taskkill /FI "WINDOWTITLE eq LiDAR Frontend Server*" /T /F >nul 2>&1
taskkill /IM "node.exe" /F /T >nul 2>&1

echo.
echo ===================================================
echo All background processes and terminal windows 
echo have been successfully closed!
echo ===================================================
echo.
pause
