
const PocketBase = require('pocketbase/cjs');

async function resetUserPassword() {
    const pb = new PocketBase('http://127.0.0.1:8090');
    
    try {
        await pb.collection('_superusers').authWithPassword('admin@docvault.local', 'admin123!45');
        console.log("✅ Authenticated as superuser");

        // Find the user
        const user = await pb.collection('users').getFirstListItem('email="admin.api@gmail.com"');
        console.log(`👤 Found user: ${user.email} (ID: ${user.id})`);

        // Force reset password
        await pb.collection('users').update(user.id, {
            password: "admin123!45",
            passwordConfirm: "admin123!45",
        });
        console.log("✅ Password successfully reset to: admin123!45");

        // Verify rules again for users collection - it MUST be manageable
        const userColl = await pb.collections.getOne("users");
        userColl.authRule = ""; // Empty string allows anyone to attempt auth
        userColl.listRule = "@request.auth.id != ''";
        userColl.viewRule = "@request.auth.id != ''";
        await pb.collections.update(userColl.id, userColl);
        console.log("🔓 User auth rules verified.");

    } catch (err) {
        console.error("❌ Reset failed:", err.message);
        if (err.data) console.log(JSON.stringify(err.data));
    }
}

resetUserPassword();
