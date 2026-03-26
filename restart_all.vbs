' DocVault - Restart All Services (Silent)
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strDocVaultPath = "d:\BACKUP INUL WINDOWS (2026)\Music\docvault"

' Kill existing processes
objShell.Run "taskkill /F /IM node.exe", 0, True
objShell.Run "taskkill /F /IM pocketbase.exe", 0, True

' Wait 2 seconds
WScript.Sleep 2000

' Start PocketBase
objShell.Run "cmd /c ""cd /d """ & strDocVaultPath & "\pocketbase"" && pocketbase.exe serve""", 0, False

' Wait 3 seconds for PocketBase to start
WScript.Sleep 3000

' Start Frontend
objShell.Run "cmd /c ""cd /d """ & strDocVaultPath & """ && npm run dev""", 0, False

' Show completion message
MsgBox "✓ DocVault services restarted!" & vbCrLf & vbCrLf & _
       "• PocketBase: http://127.0.0.1:8090" & vbCrLf & _
       "• Frontend: Will open in browser" & vbCrLf & vbCrLf & _
       "Please hard refresh browser (Ctrl+Shift+R) to load new code!", _
       vbInformation, "DocVault Restarted"
