# DocVault Sharing System Documentation

This document explains the architecture and troubleshooting for the **Public Sharing Toggle** in DocVault.

## 🏗️ Architecture

Because of Windows security restrictions and PocketBase's isolated execution environment, we use a **Node.js Helper Service** to bridge the gap between the UI and `ngrok`.

### 1. `sharing-helper.cjs` (The "Bridge")
- **Location**: Project Root
- **Role**: A tiny background server listening on **Port 4041**.
- **Logic**: It receives commands from the UI and uses **PowerShell's `Start-Process -WindowStyle Hidden`** to start/stop `ngrok.exe` reliably and silently.
- **Why?**: Standard Node.js processes have the correct permissions to spawn children, and the `-WindowStyle Hidden` flag ensures **0 terminal windows** flash when you use the toggle.

### 2. `DocVault.vbs` (The Startup)
- **Role**: Launches both PocketBase and the `sharing-helper.cjs` in **Hidden** mode.
- **Benefit**: Ensures the sharing system is always ready without showing extra terminal windows on boot.

### 3. `Layout.jsx` (The UI)
- **Role**: Sends `fetch` requests to `localhost:4041`.
- **Sync**: It polls the helper every few seconds to update the "Green/Red" status and display the public URL.
- **Bonus**: Includes a **"Database CMS"** link directly in the sidebar footer for easy backend access.

---

## 🛠️ Troubleshooting

### "Toggle Error: Not Found"
- **Cause**: The `sharing-helper.cjs` is likely not running.
- **Fix**: Run `DocVault.vbs` again or start it manually in a terminal: `node sharing-helper.cjs`.

### "Toggle stays OFF / Error: Session Limit"
- **Cause**: You likely have another `ngrok` session active on your account (check your ngrok dashboard).
- **Fix**: The helper automatically tries to kill old sessions, but if it fails, manually run:
  `powershell -Command "Stop-Process -Name ngrok -Force"`

---

## 🚀 Manual Maintenance

- **Restarting the Helper Silently**:
  ```powershell
  taskkill /f /im node.exe
  powershell -WindowStyle Hidden -Command "Start-Process node -ArgumentList 'sharing-helper.cjs' -WindowStyle Hidden"
  ```
- **Checking if alive**:
  ```powershell
  netstat -ano | findstr :4041
  ```

---

*This system was implemented to provide a native-feeling, distraction-free sharing experience.* 🛡️🚀💎
