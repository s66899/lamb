// 设备监测本地服务器 (在 Windows 机器后台运行)
// v3.7.4h 加固版：uncaughtException 守护 + EADDRINUSE 端口重试 + 健康检查
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4689;
const DATA_FILE = path.join(__dirname, '..', 'tracker-data.json');
const ADMIN_PW = 'lambadmin'; // 管理员密码
const START_TIME = Date.now();
let devices = {};

// === 进程级守护：捕获所有未处理异常不让进程挂 ===
process.on('uncaughtException', (err) => {
  console.error('[tracker] uncaughtException:', err && err.message || err);
  // 不退出，继续服务
});
process.on('unhandledRejection', (reason) => {
  console.error('[tracker] unhandledRejection:', reason && reason.message || reason);
  // 不退出，继续服务
});

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      devices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch(e) {
    console.error('[tracker] load error:', e.message);
    devices = {};
  }
}

function save() {
  try {
    // 写入到临时文件再 rename，避免半写状态
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(devices, null, 2));
    fs.renameSync(tmp, DATA_FILE);
  } catch(e) {
    console.error('[tracker] save error:', e.message);
  }
}

load();
setInterval(save, 30000); // 每 30 秒持久化

// 清理超时设备 (70 秒无心跳 → 离线)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const id in devices) {
    if (devices[id].online && now - devices[id].lastSeen > 70000) {
      devices[id].online = false;
      changed = true;
    }
  }
  if (changed) save();
}, 15000);

function handler(req, res) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, cors).end();
    return;
  }

  let url;
  try { url = new URL(req.url, 'http://localhost'); }
  catch(e) { res.writeHead(400, cors).end('bad url'); return; }
  const p = url.pathname;

  // 健康检查
  if (req.method === 'GET' && p === '/health') {
    const uptime = Math.floor((Date.now() - START_TIME) / 1000);
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      uptime,
      devices: Object.keys(devices).length,
      online: Object.values(devices).filter(d => d.online).length,
      version: 'v3.7.4h',
    }));
    return;
  }

  // 心跳
  if (req.method === 'POST' && p === '/heartbeat') {
    let body = '';
    req.setTimeout(5000, () => { res.writeHead(408, cors).end('timeout'); req.destroy(); });
    req.on('data', c => { if (body.length < 8192) body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const id = data.fingerprint;
        if (!id) { res.writeHead(400, cors).end('no fingerprint'); return; }
        devices[id] = {
          ...(devices[id] || {}),
          fingerprint: id,
          browser: data.browser || '?',
          os: data.os || '?',
          screen: data.screen || '?',
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?',
          firstSeen: (devices[id] && devices[id].firstSeen) || Date.now(),
          lastSeen: Date.now(),
          online: true,
        };
        res.writeHead(200, cors).end('ok');
      } catch(e) {
        res.writeHead(400, cors).end('bad json');
      }
    });
    req.on('error', () => {});
    return;
  }

  // 获取设备列表 (需要管理员密码)
  if (req.method === 'GET' && p === '/devices') {
    const pw = url.searchParams.get('pw');
    if (pw !== ADMIN_PW) {
      res.writeHead(403, cors).end('wrong password');
      return;
    }
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(devices, null, 2));
    return;
  }

  // 强制下线设备
  if (req.method === 'POST' && p === '/kick') {
    let body = '';
    req.setTimeout(5000, () => { res.writeHead(408, cors).end('timeout'); req.destroy(); });
    req.on('data', c => { if (body.length < 4096) body += c; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (data.pw !== ADMIN_PW) {
          res.writeHead(403, cors).end('wrong password');
          return;
        }
        const fid = data.fingerprint;
        if (devices[fid]) {
          devices[fid].online = false;
          devices[fid].kicked = true;
          devices[fid].kickedAt = Date.now();
          save();
          res.writeHead(200, cors).end('kicked');
        } else {
          res.writeHead(404, cors).end('not found');
        }
      } catch(e) {
        res.writeHead(400, cors).end('bad json');
      }
    });
    req.on('error', () => {});
    return;
  }

  // 简单状态页
  if (req.method === 'GET' && p === '/status') {
    const online = Object.values(devices).filter(d => d.online).length;
    const total = Object.keys(devices).length;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Device Tracker: ${online} online / ${total} total\n`);
    return;
  }

  res.writeHead(404, cors).end('not found');
}

// === 端口监听 + EADDRINUSE 重试 ===
function listenWithRetry(port, attempt = 0) {
  const srv = http.createServer(handler);
  srv.on('clientError', (err, socket) => {
    try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch(e) {}
  });
  srv.listen(port, () => {
    console.log('=== Device Tracker Server v3.7.4h ===');
    console.log('Port:', port);
    console.log('Admin PW:', ADMIN_PW);
    console.log('Data file:', DATA_FILE);
    console.log('Health: GET /health');
    console.log('Waiting for heartbeats...');
  });
  srv.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt < 5) {
      console.error(`[tracker] port ${port} in use, retry ${attempt + 1}/5 in 2s...`);
      setTimeout(() => listenWithRetry(port + 1, attempt + 1), 2000);
    } else {
      console.error('[tracker] fatal listen error:', err.message);
    }
  });
  return srv;
}

listenWithRetry(PORT);