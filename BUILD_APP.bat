@echo off
setlocal
cd /d "%~dp0"

echo 🛠️ Building DocVault for App Mode...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b %errorlevel%
)

echo 📁 Copying files to PocketBase...
powershell -Command "New-Item -ItemType Directory -Force -Path 'C:\pocketbase\pb_public'; Copy-Item -Path 'dist\*' -Destination 'C:\pocketbase\pb_public' -Recurse -Force"

echo ✅ Build refreshed! You can now use DocVault.vbs to start the app.
echo.
pause
