# Chat Widget Troubleshooting Guide

## Issue: "I can't find any chat icon"

### Quick Checks

#### 1. **Check if you're logged in**
- The chat widget only shows when you're authenticated
- Make sure you're logged into DocVault

#### 2. **Check browser console for errors**
1. Open browser DevTools (`F12`)
2. Go to **Console** tab
3. Look for any red errors
4. Common errors:
   - `Failed to fetch` - PocketBase not running
   - `Collection not found` - Collections don't exist (this is OK, widget should still show)
   - Component errors - React rendering issues

#### 3. **Look for the floating button**
The chat widget appears as a **blue circular button** with a ⭐ star icon in the **bottom-right corner** of the screen.

**If you don't see it:**

---

## Solution Steps

### Step 1: Make Sure PocketBase is Running

```bash
# Check if PocketBase is running
# Open http://localhost:8090/_/ in browser
# If it doesn't load, start PocketBase:

cd "d:\BACKUP INUL WINDOWS (2026)\Music\docvault"
.\start-pocketbase.bat
```

### Step 2: Make Sure DocVault App is Running

```bash
# In a NEW terminal (keep PocketBase running)
cd "d:\BACKUP INUL WINDOWS (2026)\Music\docvault"
npm run dev
```

Then open `http://localhost:5173` in your browser (or whatever port Vite shows)

### Step 3: Check Browser Console

Open DevTools (F12) and look for these messages:

✅ **Good messages** (safe to ignore):
```
Could not load chat_settings (collection may not exist)
Could not load chat_api_keys (collection may not exist)
Could not load chat_conversations (collection may not exist)
Chat store initialized (collections may not exist yet - see warnings above)
```

❌ **Bad messages** (need to fix):
```
Failed to fetch
Network error
Cannot read property 'id' of undefined
Component error
```

### Step 4: Verify Layout is Rendering ChatWidget

1. Open DevTools (F12)
2. Go to **Elements** or **Inspector** tab
3. Press `Ctrl+F` to search in HTML
4. Search for: `ChatWidget` or `fixed` or `bottom-6 right-6`
5. You should see a button element with classes like:
   ```html
   <button class="fixed bottom-6 right-6 z-[3000] w-14 h-14 rounded-full ...">
   ```

**If you DON'T see it:**
- The ChatWidget component is not rendering
- Check for JavaScript errors in console
- Make sure you saved all files and refreshed the browser

### Step 5: Force Enable Chat Widget

If the widget is still not showing, you can force it on via browser console:

1. Open DevTools Console (`F12`)
2. Run this command:

```javascript
// Get the chat store and enable the widget
const chatStore = window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.currentDispatcherRef?.current;

// Or try this simpler approach - just check localStorage
localStorage.setItem('chat-enabled', 'true');
location.reload();
```

### Step 6: Check CSS z-index Issues

The chat button uses `z-[3000]`. If something else on the page has a higher z-index, it might be covering the button.

1. Open DevTools (F12)
2. Go to **Elements** tab
3. Click the element selector tool (top-left corner icon)
4. Try to click where the chat button should be (bottom-right)
5. Check if you're selecting a different element that's covering it

---

## Common Issues & Solutions

### Issue: Chat button visible but clicking does nothing

**Cause:** JavaScript error when opening the widget

**Solution:**
1. Check browser console for errors
2. Look for errors related to ChatWidget, ChatMessage, or chatAPI
3. Make sure all chat components are properly imported

### Issue: Chat button shows briefly then disappears

**Cause:** `settings.enabled` is being set to `false` after initialization

**Solution:**
1. Check PocketBase `chat_settings` collection
2. Make sure `enabled` field is `true`
3. Or delete the settings record to use defaults

### Issue: Widget shows but clicking Settings crashes

**Cause:** ChatSettingsModal component error

**Solution:**
1. Check browser console for the exact error
2. Make sure Modal component is imported correctly
3. Check that all UI components (Btn, Ico, FF, etc.) are available

---

## Manual Debugging

### Check if ChatWidget Component Exists

Run in browser console:

```javascript
// Check if React is loaded
console.log('React version:', React?.version);

// Try to find the chat widget in the DOM
const chatButton = document.querySelector('[title="Open AI Chat"]');
console.log('Chat button found:', chatButton);

// Check computed styles
if (chatButton) {
  const styles = window.getComputedStyle(chatButton);
  console.log('Display:', styles.display);
  console.log('Visibility:', styles.visibility);
  console.log('Z-index:', styles.zIndex);
  console.log('Position:', styles.position);
}
```

### Check Chat Store State

If you have React DevTools installed:

1. Open React DevTools
2. Go to **Components** tab
3. Search for `ChatWidget`
4. Click on it
5. Check the `props` and `hooks` to see:
   - `settings.enabled` should be `true`
   - `isOpen` state
   - `messages`, `conversations`, etc.

---

## Still Not Working?

### Last Resort: Add Debug ChatWidget

Create a test file to verify the ChatWidget renders:

**File:** `src/pages/ChatTest.jsx`

```javascript
import { ChatWidget } from '../components/chat/ChatWidget';
import { useChatStore } from '../store/useChatStore';

export function ChatTest() {
  const chatStore = useChatStore();

  return (
    <div className="p-8">
      <h1>Chat Widget Debug</h1>
      <pre>{JSON.stringify(chatStore.settings, null, 2)}</pre>
      <p>Enabled: {String(chatStore.settings.enabled)}</p>
      <p>Collections loaded: {String(chatStore._loaded)}</p>
      <ChatWidget onOpenSettings={() => alert('Settings clicked')} />
    </div>
  );
}
```

Then add to App.jsx:

```javascript
import { ChatTest } from "./pages/ChatTest";

// In the render:
{view === "chat-test" && <ChatTest />}
```

Navigate to `http://localhost:5173` and manually change URL to add `#chat-test` or click on it in nav.

---

## Expected Behavior

✅ **Without PocketBase Collections:**
- Chat button shows in bottom-right
- Clicking opens chat window
- Shows warning: "Please configure an API key in settings first"
- Settings modal opens
- API Keys tab shows "No API keys configured yet"

✅ **With PocketBase Collections Created:**
- Chat button shows
- Can add API keys via settings
- Can send messages (with valid API key)
- Messages persist across refreshes

✅ **With API Key Configured:**
- Chat button shows
- Can send messages
- AI responds with streaming text
- Messages saved to database

---

## Files to Check

If the widget is not showing, check these files are correct:

1. [src/components/Layout.jsx](src/components/Layout.jsx#L356) - ChatWidget imported and rendered
2. [src/components/chat/ChatWidget.jsx](src/components/chat/ChatWidget.jsx#L144) - Checks `settings.enabled`
3. [src/store/useChatStore.js](src/store/useChatStore.js#L27) - Default settings has `enabled: true`
4. [src/App.jsx](src/App.jsx#L38) - `initChat()` is called

---

## Quick Fix: Reset Everything

```bash
# Stop all servers
# Close all terminals

# Start fresh
cd "d:\BACKUP INUL WINDOWS (2026)\Music\docvault"

# Terminal 1: Start PocketBase
.\start-pocketbase.bat

# Terminal 2: Start Vite (in new terminal)
npm run dev

# Open browser to http://localhost:5173
# Login to DocVault
# Look for blue star button in bottom-right corner
```

---

## Get Help

If none of this works:

1. Copy the full browser console output (with errors)
2. Check the Network tab for failed requests
3. Take a screenshot of the issue
4. Check if there are any ad-blockers or browser extensions interfering

The chat widget should show even without PocketBase collections - it will just show a warning when you try to use it.
