# Chat Widget Setup Instructions

## Step 1: Create PocketBase Collections

The 400 error you're experiencing is likely because the PocketBase collections don't exist yet. Follow these steps:

### 1. Open PocketBase Admin UI
- Open `http://localhost:8090/_/` in your browser
- Make sure PocketBase is running (use `START_DOCVAULT.bat`)

### 2. Create Collections

Go to **Collections** and create these 4 collections:

#### Collection 1: `chat_settings`
- Click "New collection"
- Name: `chat_settings`
- Type: Base collection
- Add these fields:
  - `user` - Relation (to users collection, single, required)
  - `system_prompt` - Plain text
  - `model` - Plain text
  - `api_provider` - Plain text
  - `temperature` - Number
  - `max_tokens` - Number
  - `theme` - Plain text
  - `position` - Plain text
  - `primary_color` - Plain text
  - `enabled` - Bool (default: true)

**API Rules** (in the "API Rules" tab):
```
List/Search: @request.auth.id != "" && user = @request.auth.id
View: @request.auth.id != "" && user = @request.auth.id
Create: @request.auth.id != "" && @request.data.user = @request.auth.id
Update: @request.auth.id != "" && user = @request.auth.id
Delete: @request.auth.id != "" && user = @request.auth.id
```

#### Collection 2: `chat_api_keys`
- Click "New collection"
- Name: `chat_api_keys`
- Type: Base collection
- Add these fields:
  - `user` - Relation (to users collection, single, required)
  - `provider` - Plain text (required)
  - `api_key` - Plain text (required)
  - `api_base_url` - Plain text
  - `label` - Plain text
  - `models` - JSON
  - `is_active` - Bool (default: true)

**API Rules** (same as above):
```
List/Search: @request.auth.id != "" && user = @request.auth.id
View: @request.auth.id != "" && user = @request.auth.id
Create: @request.auth.id != "" && @request.data.user = @request.auth.id
Update: @request.auth.id != "" && user = @request.auth.id
Delete: @request.auth.id != "" && user = @request.auth.id
```

#### Collection 3: `chat_conversations`
- Click "New collection"
- Name: `chat_conversations`
- Type: Base collection
- Add these fields:
  - `user` - Relation (to users collection, single, required)
  - `title` - Plain text
  - `metadata` - JSON

**API Rules** (same as above)

#### Collection 4: `chat_messages`
- Click "New collection"
- Name: `chat_messages`
- Type: Base collection
- Add these fields:
  - `conversation` - Relation (to chat_conversations, single, required)
  - `user` - Relation (to users collection, single, required)
  - `role` - Plain text (required)
  - `content` - Plain text (required)
  - `metadata` - JSON

**API Rules** (same as above)

## Step 2: Configure Your First API Key

After creating the collections, you need to add an API key:

1. Refresh your DocVault app in the browser
2. You should see a floating chat button in the bottom-right corner
3. Click it to open the chat widget
4. Click the Settings icon (⚙️) in the chat header
5. Go to the "API Keys" tab
6. Click "Add Key"
7. Fill in:
   - Provider: Choose your AI provider (OpenAI, Anthropic, etc.)
   - API Key: Enter your actual API key (e.g., `sk-...` for OpenAI or `sk-ant-...` for Anthropic)
   - Label: Give it a friendly name (optional)
   - Base URL: Leave empty for default, or enter custom endpoint
8. Click "Add Key"

## Step 3: Configure Chat Settings

1. In the same settings modal, go to "General" tab
2. Configure:
   - System Prompt: Customize AI behavior (e.g., "You are a helpful assistant for DocVault...")
   - Model: Enter the model name (e.g., `gpt-4`, `claude-3-5-sonnet-20241022`, etc.)
   - API Provider: Should match your API key provider
   - Temperature: 0.7 is good default (higher = more creative)
   - Max Tokens: 2000 is good default
3. Click "Save Settings"

## Step 4: Test the Chat

1. Close the settings modal
2. Type a message in the chat input
3. The AI should respond with streaming text

## Troubleshooting 400 Errors

If you still get 400 errors after setup:

### Check 1: Verify Collections Exist
- Go to PocketBase Admin UI
- Check that all 4 collections exist with correct field names

### Check 2: Verify API Key Format
- **OpenAI**: Keys start with `sk-`
- **Anthropic**: Keys start with `sk-ant-`
- Make sure you copied the full key without spaces

### Check 3: Check Model Name
- **OpenAI**: Use `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- **Anthropic**: Use `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-sonnet-20240229`
- **Groq**: Use `mixtral-8x7b-32768`, `llama-3.1-70b-versatile`

### Check 4: Verify Provider Matches
- Make sure the "API Provider" in General settings matches the provider of your active API key

### Check 5: Browser Console
Open browser DevTools (F12) and check:
- Network tab for the actual API request
- Console for JavaScript errors
- Look for the specific 400 error message

### Check 6: API Key Permissions
- Make sure your API key has sufficient credits/quota
- Check that the API key has permission to access the chosen model

## Common Model Names

### OpenAI (api.openai.com)
- `gpt-4-turbo` - Latest GPT-4 Turbo
- `gpt-4` - GPT-4 (slower but more capable)
- `gpt-3.5-turbo` - Faster, cheaper

### Anthropic (api.anthropic.com)
- `claude-3-5-sonnet-20241022` - Latest Sonnet (best balance)
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Fast and capable
- `claude-3-haiku-20240307` - Fastest

### Groq (api.groq.com) - Super fast inference
- `mixtral-8x7b-32768` - Mixtral model
- `llama-3.1-70b-versatile` - Llama 3.1

## Need Help?

If you continue having issues:
1. Check browser console (F12)
2. Check PocketBase logs
3. Verify all collections have correct API rules
4. Make sure you're logged in to DocVault
