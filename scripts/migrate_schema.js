import fs from 'fs';
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

async function migrate() {
  await pb.admins.authWithPassword('admin@docvault.local', 'admin123!45');
  const oldCols = JSON.parse(fs.readFileSync('pocketbase-collections.json', 'utf8'));

  const newCols = [];

  for (const c of oldCols) {
    if (c.type !== 'base') continue;
    const fields = [];

    if (c.schema) {
      for (const oldField of c.schema) {
        const newField = { ...oldField };
        if (oldField.options) {
          for (const [key, value] of Object.entries(oldField.options)) {
            newField[key] = value;
          }
          delete newField.options;
        }
        // Generate valid 10-char alphanumeric id for the field
        newField.id = "f" + Math.random().toString(36).substring(2, 11);
        fields.push(newField);
      }
    }

    fields.push({
      "hidden": false,
      "id": "autodate" + Math.random().toString(36).substring(2, 10),
      "name": "created",
      "onCreate": true,
      "onUpdate": false,
      "presentable": false,
      "system": false,
      "type": "autodate"
    });
    fields.push({
      "hidden": false,
      "id": "autodate" + Math.random().toString(36).substring(2, 10),
      "name": "updated",
      "onCreate": true,
      "onUpdate": true,
      "presentable": false,
      "system": false,
      "type": "autodate"
    });

    c.fields = fields;
    delete c.schema;
    newCols.push(c);
  }

  try {
    await pb.send('/api/collections/import', {
      method: 'PUT',
      body: {
        collections: newCols,
        deleteMissing: false
      }
    });
    console.log("Migration successful!");
  } catch (e) {
    if (e.response?.data?.collections) {
       console.log("Migration Error:", JSON.stringify(e.response.data.collections, null, 2));
    } else {
       console.log("Error:", JSON.stringify(e?.response || e, null, 2));
    }
  }
}
migrate();
