Set WshShell = CreateObject("WScript.Shell")

strDocVaultPath = "d:\BACKUP INUL WINDOWS (2026)\Music\docvault"

' 1. Start PocketBase (must run from its own folder so pb_data resolves correctly)
WshShell.CurrentDirectory = strDocVaultPath & "\pocketbase"
WshShell.Run "pocketbase.exe serve", 0, False

' 2. Start Sharing Helper
WshShell.CurrentDirectory = strDocVaultPath
WshShell.Run "cmd /c node sharing-helper.cjs", 0, False

' 3. Start Vite dev server
WshShell.Run "cmd /c npm run dev", 0, False

' 4. Wait for Vite to finish starting (~5 seconds)
WScript.Sleep 5000

' 5. Open the app
WshShell.Run "http://localhost:5173"

Set WshShell = Nothing
