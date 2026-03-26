Set WshShell = CreateObject("WScript.Shell")

strDocVaultPath = "d:\BACKUP INUL WINDOWS (2026)\Music\docvault"

' 1. Start PocketBase hidden
WshShell.Run "cmd /c ""cd /d """ & strDocVaultPath & "\pocketbase"" && pocketbase.exe serve""", 0, False

' 2. Start Sharing Helper hidden
WshShell.Run "cmd /c ""cd /d """ & strDocVaultPath & """ && node sharing-helper.cjs""", 0, False

' 2. Give it a moment to start
WScript.Sleep 2000

' 3. Open the app in the browser
WshShell.Run "http://localhost:8090"

Set WshShell = Nothing
