routerAdd("GET", "/api/debug-ctx", (e) => {
    const keys = Object.keys(e);
    console.log("Context keys:", JSON.stringify(keys));
    
    let infoStr = "Keys: " + keys.join(", ");
    
    // Try to find how to get body
    try {
        const body = {};
        if (e.bind) {
            infoStr += " | Has .bind";
        }
        if (e.requestInfo) {
            infoStr += " | Has .requestInfo";
        }
        if (typeof $apis !== 'undefined' && $apis.requestInfo) {
            infoStr += " | Has $apis.requestInfo";
        }
    } catch(err) {
        infoStr += " | Error: " + err.toString();
    }
    
    return e.json(200, { info: infoStr, keys: keys });
});
