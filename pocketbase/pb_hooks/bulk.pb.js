routerAdd("POST", "/api/bulk-delete", (e) => {
    try {
        const data = new DynamicModel({
            "ids": []
        });
        e.bindBody(data);
        let ids = data.ids || [];
        
        if (ids.length === 0) {
            return e.json(400, { error: "No ids provided" });
        }
        
        // Sanitize IDs (must be 15 chars)
        let sanitizedIds = ids.map(id => id.toString().substring(0, 15));
        let idList = sanitizedIds.map(id => `'${id}'`).join(',');
        
        $app.runInTransaction((txApp) => {
            txApp.db().newQuery(`DELETE FROM items WHERE poId IN (${idList})`).execute();
            txApp.db().newQuery(`DELETE FROM dos WHERE poId IN (${idList})`).execute();
            txApp.db().newQuery(`DELETE FROM pos WHERE id IN (${idList})`).execute();
        });
        
        return e.json(200, { success: true });
    } catch (err) {
        return e.json(200, { error: err.toString(), success: false });
    }
});

routerAdd("POST", "/api/bulk-import", (e) => {
    try {
        const data = new DynamicModel({
            "pos": [],
            "metadata": {}
        });
        e.bindBody(data);
        
        const pos = data.pos || [];
        const metadata = data.metadata || {};
        
        let createdPOs = 0;
        let createdItems = 0;
        
        $app.runInTransaction((txApp) => {
            if (metadata.companies) {
                const compCol = txApp.findCollectionByNameOrId("companies");
                for(let c of metadata.companies) {
                    try {
                        const existing = txApp.findFirstRecordByData("companies", "name", c);
                        if (existing) continue;
                    } catch(e) {}
                    
                    try {
                        const comp = new Record(compCol);
                        comp.set("name", c);
                        txApp.save(comp);
                    } catch(ce) {}
                }
            }
            
            const poCollection = txApp.findCollectionByNameOrId("pos");
            const itemCollection = txApp.findCollectionByNameOrId("items");
            
            for (let poData of pos) {
                let items = poData.items || [];
                
                let poRecord;
                try {
                    poRecord = txApp.findFirstRecordByData("pos", "orderNo", poData.orderNo);
                } catch(err) {} 
                
                if (!poRecord) {
                    poRecord = new Record(poCollection);
                    if (poData.id) poRecord.set("id", poData.id.toString().substring(0, 15));
                }
                
                poRecord.set("orderNo", poData.orderNo);
                poRecord.set("company", poData.company);
                poRecord.set("orderDate", poData.orderDate);
                poRecord.set("prNo", poData.prNo || "");
                poRecord.set("notes", poData.notes || "");
                poRecord.set("status", poData.status || "draft");
                poRecord.set("priority", poData.priority || "normal");
                poRecord.set("totalLocked", !!poData.totalLocked);
                poRecord.set("manualExPPN", Number(poData.manualExPPN) || 0);
                poRecord.set("manualPPN", Number(poData.manualPPN) || 0);
                
                txApp.save(poRecord);
                createdPOs++;
                
                for(let item of items) {
                    let itemRecord;
                    const itemId = item.id ? item.id.toString().substring(0, 15) : null;
                    
                    if (itemId) {
                        try {
                            itemRecord = txApp.findRecordById("items", itemId);
                        } catch(err) {} 
                    }
                    
                    if (!itemRecord) {
                        itemRecord = new Record(itemCollection);
                        if (itemId) itemRecord.set("id", itemId);
                    }
                    
                    itemRecord.set("poId", poRecord.id);
                    itemRecord.set("itemName", item.itemName);
                    itemRecord.set("desc", item.desc || "");
                    itemRecord.set("qty", Number(item.qty) || 0);
                    itemRecord.set("unit", item.unit || "pcs");
                    itemRecord.set("unitPrice", Number(item.unitPrice) || 0);
                    itemRecord.set("discount", Number(item.discount) || 0);
                    itemRecord.set("discountPct", Number(item.discountPct) || 0);
                    itemRecord.set("status", item.status || "pending");
                    itemRecord.set("deliveryDate", item.deliveryDate || "");
                    itemRecord.set("invoiceNo", item.invoiceNo || "");
                    itemRecord.set("zoneType", item.zoneType || "");
                    itemRecord.set("hsCode", item.hsCode || "");
                    
                    txApp.save(itemRecord);
                    createdItems++;
                }
            }
        });
        
        return e.json(200, { success: true, createdPOs, createdItems });
    } catch (err) {
        return e.json(200, { error: err.toString(), success: false, message: err.toString() });
    }
});
