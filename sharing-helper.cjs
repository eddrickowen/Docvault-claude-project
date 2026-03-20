const http = require('http');
const { exec } = require('child_process');

const PORT = 4041;
const NGROK_CMD = 'ngrok http 8090';

// Kill existing ngrok
function killNgrok(callback) {
  exec('powershell -Command "Stop-Process -Name ngrok -Force -ErrorAction SilentlyContinue"', (err) => {
    if (callback) callback();
  });
}

function getStatus(res) {
  const req = http.get('http://127.0.0.1:4040/api/tunnels', (apiRes) => {
    let rawData = '';
    apiRes.on('data', (chunk) => { rawData += chunk; });
    apiRes.on('end', () => {
      try {
        const body = JSON.parse(rawData);
        const data = (body.tunnels && body.tunnels.length > 0) 
          ? { active: true, url: body.tunnels[0].public_url }
          : { active: false, url: '' };
        
        sendJSON(res, 200, data);
      } catch (e) {
        sendJSON(res, 200, { active: false, url: '' });
      }
    });
  });

  req.on('error', (e) => {
    sendJSON(res, 200, { active: false, url: '' });
  });
}

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/sharing/status') {
    getStatus(res);
  } else if (url.pathname === '/api/sharing/toggle') {
    const active = url.searchParams.get('active') === 'true';
    
    killNgrok(() => {
      if (active) {
        // Use PowerShell Start-Process with -WindowStyle Hidden for TRULY silent launch
        const psCmd = `powershell -Command "Start-Process ngrok -ArgumentList 'http 8090' -WindowStyle Hidden"`;
        exec(psCmd, (err) => {
          if (err) console.error('Failed to start ngrok:', err);
        });
        sendJSON(res, 200, { message: 'Starting' });
      } else {
        sendJSON(res, 200, { message: 'Stopped' });
      }
    });
  } else {
    res.writeHead(404, { 'Access-Control-Allow-Origin': '*' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sharing Helper is live on port ${PORT}`);
});
