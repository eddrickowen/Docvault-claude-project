@echo off
REM Helper script to kill DocVault processes
REM Called by the shutdown endpoint

timeout /t 1 /nobreak >nul

echo Shutting down DocVault...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM pocketbase.exe >nul 2>&1

echo DocVault shutdown complete
exit
