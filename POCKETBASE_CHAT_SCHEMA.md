# PocketBase Chat Widget Schema

This document describes the PocketBase collections needed for the chat widget feature.

## Collections to Create in PocketBase Admin UI

### 1. chat_settings (Collection)

**Fields:**
- `user` (Relation to users, single, required) - Owner of settings
- `system_prompt` (Text) - Custom system prompt for AI
- `model` (Text) - Selected AI model (e.g., "gpt-4", "claude-3-sonnet")
- `api_provider` (Text) - Provider name (openai, anthropic, etc.)
- `temperature` (Number, 0-2, default: 0.7) - Model temperature
- `max_tokens` (Number, default: 2000) - Max response tokens
- `theme` (Text, default: "auto") - Widget theme (light, dark, auto)
- `position` (Text, default: "bottom-right") - Widget position
- `primary_color` (Text, default: "#3b82f6") - Primary theme color
- `enabled` (Bool, default: true) - Widget enabled/disabled

**Rules:**
- List rule: `@request.auth.id != "" && user = @request.auth.id`
- View rule: `@request.auth.id != "" && user = @request.auth.id`
- Create rule: `@request.auth.id != "" && @request.data.user = @request.auth.id`
- Update rule: `@request.auth.id != "" && user = @request.auth.id`
- Delete rule: `@request.auth.id != "" && user = @request.auth.id`

### 2. chat_api_keys (Collection)

**Fields:**
- `user` (Relation to users, single, required) - Owner of API key
- `provider` (Text, required) - Provider name (openai, anthropic, groq, etc.)
- `api_key` (Text, required) - Encrypted API key
- `api_base_url` (Text) - Optional custom base URL
- `label` (Text) - Optional label/description
- `models` (JSON) - Array of available models for this key
- `is_active` (Bool, default: true) - Whether key is active

**Rules:**
- List rule: `@request.auth.id != "" && user = @request.auth.id`
- View rule: `@request.auth.id != "" && user = @request.auth.id`
- Create rule: `@request.auth.id != "" && @request.data.user = @request.auth.id`
- Update rule: `@request.auth.id != "" && user = @request.auth.id`
- Delete rule: `@request.auth.id != "" && user = @request.auth.id`

### 3. chat_conversations (Collection)

**Fields:**
- `user` (Relation to users, single, required) - Owner of conversation
- `title` (Text) - Conversation title (auto-generated from first message)
- `metadata` (JSON) - Extra data (model used, tokens, etc.)
- Note: `created` and `updated` fields are auto-created by PocketBase

**Rules:**
- List rule: `@request.auth.id != "" && user = @request.auth.id`
- View rule: `@request.auth.id != "" && user = @request.auth.id`
- Create rule: `@request.auth.id != "" && @request.data.user = @request.auth.id`
- Update rule: `@request.auth.id != "" && user = @request.auth.id`
- Delete rule: `@request.auth.id != "" && user = @request.auth.id`

### 4. chat_messages (Collection)

**Fields:**
- `conversation` (Relation to chat_conversations, single, required)
- `user` (Relation to users, single, required) - Owner
- `role` (Text, required) - "user", "assistant", or "system"
- `content` (Text, required) - Message content
- `metadata` (JSON) - Tokens, model, timing, etc.
- Note: `created` and `updated` fields are auto-created by PocketBase

**Rules:**
- List rule: `@request.auth.id != "" && user = @request.auth.id`
- View rule: `@request.auth.id != "" && user = @request.auth.id`
- Create rule: `@request.auth.id != "" && @request.data.user = @request.auth.id`
- Update rule: `@request.auth.id != "" && user = @request.auth.id`
- Delete rule: `@request.auth.id != "" && user = @request.auth.id`

## Setup Instructions

1. Open PocketBase Admin UI (usually http://localhost:8090/_/)
2. Go to Collections
3. Create each collection above with the specified fields
4. Set the access rules as specified
5. The chat widget will automatically connect and sync data

## Notes

- API keys are stored in PocketBase but should ideally be encrypted at rest
- Consider adding rate limiting on the server side
- The chat widget supports streaming via Server-Sent Events (SSE)
- All conversations are private to the authenticated user
