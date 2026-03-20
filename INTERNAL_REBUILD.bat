@echo off
cd /d "%~dp0"
echo 🛠️  Rebuilding...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo 📁 Syncing...
powershell -Command "Copy-Item -Path 'dist\*' -Destination 'C:\pocketbase\pb_public' -Recurse -Force"

echo 🛑 Stopping PocketBase...
taskkill /f /im pocketbase.exe

echo 🚀 Starting PocketBase...
powershell -Command "Start-Process -FilePath 'C:\pocketbase\pocketbase.exe' -ArgumentList 'serve' -WindowStyle Hidden -WorkingDirectory 'C:\pocketbase'"

echo ✅ Done!
