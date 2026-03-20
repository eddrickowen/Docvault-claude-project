Set WshShell = CreateObject("WScript.Shell")

' 1. Start PocketBase hidden
WshShell.Run "cmd /c ""cd /d C:\pocketbase && pocketbase.exe serve""", 0, False

' 2. Start Sharing Helper hidden
WshShell.Run "cmd /c ""cd /d c:\Users\Eddri\Music\docvault && node sharing-helper.cjs""", 0, False

' 2. Give it a moment to start
WScript.Sleep 2000

' 3. Open the app in the browser
WshShell.Run "http://localhost:8090"

Set WshShell = Nothing
