// 设备监测本地服务器 (在 Windows 机器后台运行)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4689;
const DATA_FILE = path.join(__dirname, '..', 'tracker-data.json');
const ADMIN_PW = 'lambadmin'; // 管理员密码

// 内存中的设备列表
let devices = {};

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      devices = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch(e) { devices = {}; }
}

function save() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(devices, null, 2)); } catch(e) {}
}

load();
setInterval(save, 30000); // 每30秒持久化

// 清理超时设备 (60秒无心跳)
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const id in devices) {
    if (now - devices[id].lastSeen > 70000) {
      devices[id].online = false;
      changed = true;
    }
  }
  if (changed) save();
}, 15000);

http.createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(200, cors).end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const path = url.pathname;

  // 心跳
  if (req.method === 'POST' && path === '/heartbeat') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const id = data.fingerprint;
        if (!id) { res.writeHead(400, cors).end('no fingerprint'); return; }
        devices[id] = {
          ...devices[id] || {},
          fingerprint: id,
          browser: data.browser || '?',
          os: data.os || '?',
          screen: data.screen || '?',
          ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress || '?',
          firstSeen: devices[id]?.firstSeen || Date.now(),
          lastSeen: Date.now(),
          online: true,
        };
        res.writeHead(200, cors).end('ok');
      } catch(e) {
        res.writeHead(400, cors).end('bad');
      }
    });
    return;
  }

  // 获取设备列表 (需要管理员密码)
  if (req.method === 'GET' && path === '/devices') {
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
  if (req.method === 'POST' && path === '/kick') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
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
        res.writeHead(400, cors).end('bad');
      }
    });
    return;
  }

  // 简单状态页
  if (req.method === 'GET' && path === '/status') {
    const online = Object.values(devices).filter(d => d.online).length;
    const total = Object.keys(devices).length;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Device Tracker: ${online} online / ${total} total\n`);
    return;
  }

  res.writeHead(404, cors).end('not found');
}).listen(PORT, () => {
  console.log('=== Device Tracker Server ===');
  console.log('Port:', PORT);
  console.log('Admin PW:', ADMIN_PW);
  console.log('Data file:', DATA_FILE);
  console.log('Waiting for heartbeats...');
});
