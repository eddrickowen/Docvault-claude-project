@echo off
echo ============================================
echo   Stopping DocVault Services
echo ============================================
echo.

echo Stopping Node.js...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Node.js stopped
) else (
    echo ℹ No Node.js process running
)

echo Stopping PocketBase...
taskkill /F /IM pocketbase.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ PocketBase stopped
) else (
    echo ℹ No PocketBase process running
)

echo.
echo All services stopped!
echo.
pause
