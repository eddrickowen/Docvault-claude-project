@echo off
setlocal
cd /d "%~dp0"

echo 🚀 Starting DocVault Ecosystem...
echo.

REM 1. Start PocketBase Backend in a new window
echo [SERVER] Starting PocketBase...
start "PocketBase Backend" cmd /c "start-pocketbase.bat"

REM Give PocketBase a brief moment to initialize
timeout /t 3 /nobreak > nul

REM 2. Start DocVault Frontend in a new window
echo [FRONTEND] Starting Vite Dev Server...
start "DocVault Frontend" cmd /c "npm run dev"

REM Give Vite a brief moment to start
timeout /t 5 /nobreak > nul

REM 3. Open the browser
echo 🌐 Opening DocVault in browser...
start http://localhost:5173

echo.
echo ✅ All systems are launching! 
echo.
echo - PocketBase Admin: http://localhost:8090/_/
echo - DocVault App: http://localhost:5173
echo.
echo Keep this window open or close it once you're done.
echo.
pause
