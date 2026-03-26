
const PocketBase = require('pocketbase/cjs');

async function modernRestore() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    
    try {
        await pb.collection('_superusers').authWithPassword('admin@docvault.local', 'admin123!45');
        console.log("✅ Authenticated as superuser");

        // Helper to find or create collection with v0.30+ structure
        async function ensureCollection(config) {
            try {
                process.stdout.write(`🛠️  Ensuring ${config.name}... `);
                let existing;
                try {
                    existing = await pb.collections.getOne(config.name);
                } catch (e) {}

                if (existing) {
                    // Update
                    Object.assign(existing, config);
                    await pb.collections.update(existing.id, existing);
                    console.log("UPDATED ✅");
                } else {
                    // Create
                    await pb.collections.create(config);
                    console.log("CREATED ✅");
                }
            } catch (err) {
                console.log("FAILED ❌");
                console.error("   Error:", err.message);
                if (err.data) console.error("   Data:", JSON.stringify(err.data));
            }
        }

        // Define collections for v0.36+ 
        // IMPORTANT: We REMOVE the manual 'id' field to let PB generate it.
        const collections = [
            {
                name: "chat_conversations",
                type: "base",
                fields: [
                    { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", maxSelect: 1 },
                    { name: "title", type: "text", required: true },
                    { name: "metadata", type: "json" }
                ],
                listRule: "@request.auth.id = user.id",
                viewRule: "@request.auth.id = user.id",
                createRule: "@request.auth.id != ''",
                updateRule: "@request.auth.id = user.id",
                deleteRule: "@request.auth.id = user.id",
            },
            {
                name: "chat_messages",
                type: "base",
                fields: [
                    { name: "conversation", type: "relation", required: true, collectionId: "chat_conversations", maxSelect: 1, cascadeDelete: true },
                    { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", maxSelect: 1 },
                    { name: "role", type: "text" },
                    { name: "content", type: "text" },
                    { name: "metadata", type: "json" }
                ],
                listRule: "@request.auth.id = user.id",
                viewRule: "@request.auth.id = user.id",
                createRule: "@request.auth.id != ''",
                updateRule: "@request.auth.id = user.id",
                deleteRule: "@request.auth.id = user.id",
            },
            {
                name: "chat_api_keys",
                type: "base",
                fields: [
                    { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", maxSelect: 1 },
                    { name: "name", type: "text", required: true },
                    { name: "provider", type: "text", required: true },
                    { name: "api_key", type: "text", required: true },
                    { name: "api_base_url", type: "text" },
                    { name: "is_active", type: "bool" },
                    { name: "metadata", type: "json" }
                ],
                listRule: "@request.auth.id = user.id",
                viewRule: "@request.auth.id = user.id",
                createRule: "@request.auth.id != ''",
                updateRule: "@request.auth.id = user.id",
                deleteRule: "@request.auth.id = user.id",
            },
            {
                name: "chat_settings",
                type: "base",
                fields: [
                    { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", maxSelect: 1 },
                    { name: "system_prompt", type: "text" },
                    { name: "model", type: "text" },
                    { name: "api_provider", type: "text" },
                    { name: "temperature", type: "number" },
                    { name: "max_tokens", type: "number" },
                    { name: "enabled", type: "bool" },
                    { name: "theme", type: "text" },
                    { name: "position", type: "text" },
                    { name: "primary_color", type: "text" }
                ],
                listRule: "@request.auth.id = user.id",
                viewRule: "@request.auth.id = user.id",
                createRule: "@request.auth.id != ''",
                updateRule: "@request.auth.id = user.id",
                deleteRule: "@request.auth.id = user.id",
            }
        ];

        for (const config of collections) {
            await ensureCollection(config);
        }

        console.log("\n🚀 Modern restoration complete (without manual ID fields)!");
        
    } catch (err) {
        console.error("❌ Auth failed:", err.message);
    }
}

modernRestore();
