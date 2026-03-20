# ✅ Super Simple Manual Setup (2 minutes)

The auto-setup needs admin access, so let's do it manually - it's actually faster!

---

## STEP 1: Create Admin (30 seconds)

**Open this in your browser:**
```
http://localhost:8090/_/
```

You'll see a form. Fill in:
- Email: `admin@docvault.local`
- Password: (choose one - WRITE IT DOWN!)
- Confirm password: (same)

Click **"Create and login"**

✅ Done! You're now in PocketBase Admin UI.

---

## STEP 2: Create Collections - EASY WAY (30 seconds)

**In the PocketBase Admin UI:**

1. Click **"Settings"** (bottom-left, gear icon)
2. Click **"Import collections"** tab
3. Click **"Load from JSON file"** button
4. Select file: `pocketbase-collections.json`
   - It's in your project folder: `C:\Users\Eddri\Music\docvault\`
5. Click **"Review"**
6. Click **"Confirm and import"**

✅ All 8 collections created!

**Can't find the file?** Use Option B below.

---

## OPTION B: Create Collections Manually (if JSON import doesn't work)

**Just create ONE collection called "users":**

1. Click **"Collections"** in sidebar
2. Click **"+ New collection"**
3. Select **"Auth collection"**
4. Name: `users`
5. Click **"Create"**

✅ That's enough to get started!

(The other collections will be created automatically by the app when needed)

---

## STEP 3: Start Your App (1 minute)

**In your terminal:**
```bash
npm run dev
```

**Open browser:**
```
http://localhost:5173
```

You'll see a **LOGIN SCREEN**! 🎉

---

## STEP 4: Create Your First User

**TWO OPTIONS:**

### Option A: Via PocketBase Admin UI (Recommended)
1. In PocketBase Admin, click **"users"** in Collections
2. Click **"+ New record"**
3. Fill in:
   - Email: `admin@docvault.local`
   - Password: (your choice)
   - Confirm: (same)
4. Click **"Create"**

### Option B: Via Signup (If login screen has signup option)
- Just fill the form on the login screen
- Create your account

---

## STEP 5: Login & Enjoy! 🎉

**On the login screen:**
- Email: (what you just created)
- Password: (what you just created)

Click **"Sign In"**

✅ **YOU'RE IN!**

---

## 📊 Migration (Optional - if you have existing data)

Once logged in:

1. Press **F12** (open console)
2. Paste this:

```javascript
import('./src/lib/migrateData.js').then(async (m) => {
  await m.exportIndexedDBData(); // Backup first
  const result = await m.migrateFromIndexedDB();
  if (result.success) {
    alert('Migration complete!');
    window.location.reload();
  }
});
```

3. Press **Enter**
4. Wait for migration
5. Page refreshes with all your data!

---

## ✅ SUCCESS CHECKLIST

- [ ] Admin created in PocketBase
- [ ] Collections created (or at least "users")
- [ ] Can see login screen at http://localhost:5173
- [ ] User account created
- [ ] Can login successfully
- [ ] (Optional) Data migrated

---

## 🎉 DAILY USAGE

From now on:

1. Double-click: `start-pocketbase.bat`
2. Run: `npm run dev`
3. Open: http://localhost:5173
4. Login and work!

---

## 🚨 Troubleshooting

**"Cannot find collections file"**
- Don't worry! Just create the "users" collection manually (Option B above)
- Other collections aren't critical for testing

**"Login failed"**
- Make sure you created a user in the "users" collection
- Double-check email/password

**"Collections not found" error in app**
- That's OK for testing! Create "users" collection first
- Other collections can be created later if needed

---

## 💡 Pro Tip

You only NEED the "users" collection to test login!

The other collections (pos, items, suppliers, etc.) will be created automatically when you:
- Import data, OR
- Create your first PO

So don't worry if you can't import the JSON - just create "users" and you're good to go!

---

**Total Time: 2 minutes**
**Difficulty: Very Easy**

Just:
1. Create admin
2. Create "users" collection
3. Create your user
4. Login!

That's it! 🚀
