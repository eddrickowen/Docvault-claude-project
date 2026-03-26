
const PocketBase = require('pocketbase/cjs');

async function setup() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    
    try {
        await pb.collection('_superusers').authWithPassword('admin@docvault.local', 'admin123!45');
        console.log("✅ Authenticated as superuser");

        const users = await pb.collection('users').getFullList({ limit: 1 });
        const userId = users[0].id;

        // Update Chat Settings to use Gemini 2.0 Flash
        const existingSettings = await pb.collection('chat_settings').getFullList({
            filter: `user.id = "${userId}"`
        });

        const settingsData = {
            user: userId,
            api_provider: "gemini",
            model: "gemini-2.0-flash", // UPGRADED!
            enabled: true,
            primary_color: "#00b4d8",
            system_prompt: "You are DocVault Assistant. You use Gemini 2.0 Flash. Be helpful and professional."
        };

        if (existingSettings.length > 0) {
            await pb.collection('chat_settings').update(existingSettings[0].id, settingsData);
            console.log("✅ Updated chat settings to Gemini 2.0 Flash");
        } else {
            await pb.collection('chat_settings').create(settingsData);
            console.log("✅ Created chat settings with Gemini 2.0 Flash");
        }
        
    } catch (err) {
        console.error("❌ Setup failed:", err.message);
    }
}

setup();
