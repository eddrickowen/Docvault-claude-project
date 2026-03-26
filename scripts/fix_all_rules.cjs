
const PocketBase = require('pocketbase/cjs');

async function fixAllRules() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    
    try {
        await pb.collection('_superusers').authWithPassword('admin@docvault.local', 'admin123!45');
        console.log("✅ Authenticated as superuser");

        // 1. Audit and Fix CORE collections
        const core = ["pos", "items", "companies", "suppliers", "dos"];
        for (const name of core) {
            try {
                process.stdout.write(`🛠️ Fix ${name} Rules... `);
                const coll = await pb.collections.getOne(name);
                coll.listRule = "@request.auth.id != ''";
                coll.viewRule = "@request.auth.id != ''";
                coll.createRule = "@request.auth.id != ''";
                coll.updateRule = "@request.auth.id != ''";
                coll.deleteRule = "@request.auth.id != ''";
                await pb.collections.update(coll.id, coll);
                console.log("FIXED ✅");
            } catch (e) { console.log("SKIPPED ❌"); }
        }

        // 2. Audit and Fix CHAT collections (Owned by user)
        const chat = ["chat_api_keys", "chat_settings", "chat_conversations", "chat_messages"];
        for (const name of chat) {
            try {
                process.stdout.write(`🛠️ Fix ${name} User-specific Rules... `);
                const coll = await pb.collections.getOne(name);
                // Strict user ownership for chat
                coll.listRule = "@request.auth.id = user.id";
                coll.viewRule = "@request.auth.id = user.id";
                coll.createRule = "@request.auth.id != ''";
                coll.updateRule = "@request.auth.id = user.id";
                coll.deleteRule = "@request.auth.id = user.id";
                await pb.collections.update(coll.id, coll);
                console.log("FIXED ✅");
            } catch (e) { console.log("SKIPPED ❌"); }
        }
        
    } catch (err) {
        console.error("❌ FAILED:", err.message);
    }
}

fixAllRules();
