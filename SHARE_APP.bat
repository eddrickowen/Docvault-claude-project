@echo off
title DocVault Sharing
echo 🛰️ Starting DocVault Public Sharing...
taskkill /f /im ngrok.exe >nul 2>&1
echo.
echo Your public link will appear in the DocVault Sidebar shortly.
echo (Keep this window open while sharing)
echo.
ngrok http 8090
pause
