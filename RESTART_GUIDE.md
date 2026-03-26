# 🔄 DocVault Restart Guide

Since you're running services via VBS scripts without visible terminals, use these scripts to restart everything when code changes.

## 📁 Available Scripts

### **1. restart_all.bat** (Recommended - Visual Feedback)
- Shows what's happening in a command window
- Stops Node.js and PocketBase
- Restarts both services
- Shows URLs when done

**Usage**: Double-click `restart_all.bat`

---

### **2. restart_all.vbs** (Silent Restart)
- Runs silently in background
- Shows popup when complete
- No command windows

**Usage**: Double-click `restart_all.vbs`

---

### **3. stop_all.bat** (Stop Only)
- Stops all DocVault services
- Useful when you want to manually restart

**Usage**: Double-click `stop_all.bat`

---

## ⚡ Quick Restart Process

### When You Need to Restart:
1. **Code changes not showing** - Browser has cached JavaScript
2. **New endpoints not working** - PocketBase hasn't loaded new hooks
3. **After pulling git updates** - Need fresh code

### Steps:
1. Double-click **`restart_all.bat`**
2. Wait for "All services restarted!" message
3. **In browser**: Hard refresh with `Ctrl + Shift + R`
4. Test the feature

---

## 🧪 Verify Bulk Import is Working

After restarting, verify bulk import is active:

### Test Steps:
1. Open browser **DevTools** (Press `F12`)
2. Go to **Network** tab
3. Import a CSV/TSV file with multiple POs
4. Look for `/api/bulk-import` request
5. Should complete in **5-10 seconds** (not minutes!)

### What You Should See:
```
✅ Network Tab:
   POST /api/bulk-import
   Status: 200
   Response: {success: true, createdPOs: 50, createdItems: 200}

❌ If you see instead:
   Multiple POST /api/collections/pos/records (one per PO)
   → Browser is using old cached JavaScript
   → Do hard refresh: Ctrl + Shift + R
```

---

## 🔍 Troubleshooting

### Problem: "Import still slow after restart"

**Solution 1**: Hard refresh browser
```
Windows: Ctrl + Shift + R or Ctrl + F5
Mac: Cmd + Shift + R
```

**Solution 2**: Clear browser cache
1. DevTools (F12) → Application tab
2. Clear storage → Clear site data
3. Reload page

**Solution 3**: Check Network tab
- Should see `/api/bulk-import` being called
- If you see multiple `/api/collections/pos/records`, JavaScript is cached

---

### Problem: "404 /api/bulk-import not found"

**Solution**: PocketBase hasn't loaded the hooks

1. Stop PocketBase: Run `stop_all.bat`
2. Manually start PocketBase:
   ```
   cd C:\pocketbase
   pocketbase.exe serve
   ```
3. Look for hook loading messages in console
4. Should see: "Loading hooks from pb_hooks..."

---

### Problem: "Services won't start"

**Check ports are free**:
- PocketBase uses port `8090`
- Frontend uses port `5173` (or next available)

**Solution**: Kill processes manually
```powershell
# In PowerShell (as Admin):
Get-Process -Name node,pocketbase -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## 📌 Service URLs

After restart, services run at:

| Service | URL | Admin |
|---------|-----|-------|
| **PocketBase** | http://127.0.0.1:8090 | http://127.0.0.1:8090/_/ |
| **Frontend** | http://localhost:5173 | - |

---

## 🎯 After Restart Checklist

- [ ] Both services started (check command windows)
- [ ] Browser hard refreshed (`Ctrl + Shift + R`)
- [ ] DevTools Network tab open (F12)
- [ ] Import CSV test file
- [ ] See `/api/bulk-import` in Network tab
- [ ] Import completes in seconds ⚡

---

## 💡 Pro Tips

1. **Keep DevTools open** during testing to monitor API calls
2. **Use Network tab** to verify bulk endpoints are being called
3. **Hard refresh often** after code changes (Ctrl + Shift + R)
4. **Check PocketBase console** for hook loading errors
5. **Use restart_all.bat** for visibility during development

---

*Generated for bulk operations implementation - All endpoints are now optimized for instant performance!*
