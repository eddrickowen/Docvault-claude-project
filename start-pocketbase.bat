@echo off
echo Starting PocketBase Server...
echo.
echo Admin UI will be available at: http://localhost:8090/_/
echo API will be available at: http://localhost:8090/api/
echo.
echo Press Ctrl+C to stop the server
echo.

REM Change this path to where you extracted PocketBase
cd /d C:\pocketbase

REM Start PocketBase
pocketbase.exe serve --http="0.0.0.0:8090"

pause
