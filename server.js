/**
 * ZipCargo – Node.js Server for Render.com
 * =========================================
 * - Serves all static files (HTML, CSS, JS, images)
 * - Acts as secure proxy to JSONBin (key never exposed to browser)
 * - Handles admin login with server-side sessions
 *
 * DEFAULT LOGIN: admin / zipcargo2026
 */

const http   = require('http');
const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const PORT          = process.env.PORT || 3000;
const JSONBIN_KEY   = '$2a$10$W1QgCI2lUG0iDnjaWSI0MOeg6/PWuAJqnQ9UcqGvxvyED89713Y.W';
const SHIPMENTS_BIN = '69fbdb43adc21f119a6408ab';
const INQUIRIES_BIN = '69fbdbd4adc21f119a640d71';
const JSONBIN_BASE  = 'https://api.jsonbin.io/v3';

// Default password hash = sha256('zipcargo2026')
const DEFAULT_PASS_HASH = 'b89be84de17af0e5e68807d48d164a6b986075ddc264bbe9b60f2c27d9a6ef02';
const CREDS_FILE = path.join('/tmp', 'zc_credentials.json'); // /tmp persists within a Render instance run

function sha256(str) {
  return crypto.createHash('sha256').update(String(str)).digest('hex');
}

// ── CREDENTIALS ───────────────────────────────────────────────────────────────
function getCreds() {
  try {
    if (fs.existsSync(CREDS_FILE)) {
      const d = JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
      if (d && d.user && d.pass) return d;
    }
  } catch (e) {}
  return { user: 'admin', pass: DEFAULT_PASS_HASH };
}

function saveCreds(c) {
  try { fs.writeFileSync(CREDS_FILE, JSON.stringify(c), 'utf8'); } catch (e) {}
}

// ── SESSION STORE ─────────────────────────────────────────────────────────────
const sessions = {};

function makeToken() { return crypto.randomBytes(32).toString('hex'); }

function getSession(req) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(s => s.trim()).find(s => s.startsWith('zc_sid='));
  if (!match) return null;
  const sid = match.slice('zc_sid='.length);
  const sess = sessions[sid];
  if (!sess) return null;
  // Expire after 24 hours
  if (Date.now() - sess.created > 86400000) { delete sessions[sid]; return null; }
  return sess;
}

function createSession(res) {
  const sid = makeToken();
  sessions[sid] = { admin: true, created: Date.now() };
  const cookie = `zc_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
  res.setHeader('Set-Cookie', cookie);
}

function destroySession(req, res) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(s => s.trim()).find(s => s.startsWith('zc_sid='));
  if (match) delete sessions[match.slice('zc_sid='.length)];
  res.setHeader('Set-Cookie', 'zc_sid=; Path=/; HttpOnly; Max-Age=0');
}

// ── JSONBIN HELPER ────────────────────────────────────────────────────────────
function jsonbin(method, binId, payload) {
  return new Promise((resolve, reject) => {
    const isGet = method === 'GET';
    const urlStr = `${JSONBIN_BASE}/b/${binId}${isGet ? '/latest' : ''}`;
    const bodyStr = payload ? JSON.stringify(payload) : null;
    const urlObj = new URL(urlStr);

    const options = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method,
      headers: {
        'X-Master-Key': JSONBIN_KEY,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      },
      timeout: 20000
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── RATE LIMITER ──────────────────────────────────────────────────────────────
const rateMap = {};
function rateOk(ip) {
  const now = Date.now();
  if (!rateMap[ip] || now > rateMap[ip].reset) {
    rateMap[ip] = { count: 1, reset: now + 60000 };
    return true;
  }
  rateMap[ip].count++;
  return rateMap[ip].count <= 60;
}

// ── READ POST BODY ────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise(resolve => {
    let buf = '';
    req.on('data', chunk => { buf += chunk; if (buf.length > 500000) buf = ''; });
    req.on('end', () => {
      try { resolve(JSON.parse(buf)); } catch { resolve({}); }
    });
  });
}

// ── MIME TYPES ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

// ── SEND JSON ─────────────────────────────────────────────────────────────────
function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// ── SERVER ────────────────────────────────────────────────────────────────────
http.createServer(async (req, res) => {
  const ip  = req.socket?.remoteAddress || 'unknown';
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Always set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API PROXY ──────────────────────────────────────────────────────────────
  if (url.pathname === '/proxy') {
    if (!rateOk(ip)) { sendJSON(res, 429, { error: 'Too many requests.' }); return; }

    const action = url.searchParams.get('action') || '';
    const body   = req.method === 'POST' ? await readBody(req) : {};
    const sess   = getSession(req);

    console.log(`[${new Date().toISOString()}] action=${action} ip=${ip} authed=${!!sess}`);

    try {
      switch (action) {

        case 'getShipments': {
          const data = await jsonbin('GET', SHIPMENTS_BIN);
          sendJSON(res, 200, data?.record ?? {});
          break;
        }

        case 'saveInquiry': {
          const inq = body.inquiry || {};
          if (!inq.name || !inq.email) { sendJSON(res, 400, { error: 'Missing fields.' }); break; }
          ['name','email','service','message'].forEach(f => {
            inq[f] = String(inq[f] || '').replace(/<[^>]*>/g, '').slice(0, 500);
          });
          const current = await jsonbin('GET', INQUIRIES_BIN);
          const list = current?.record?.inquiries ?? [];
          list.push(inq);
          await jsonbin('PUT', INQUIRIES_BIN, { inquiries: list });
          sendJSON(res, 200, { ok: true });
          break;
        }

        case 'adminLogin': {
          const { user, pass } = body;
          const creds = getCreds();
          console.log(`Login attempt: user="${user}" hash="${sha256(pass)}" expected="${creds.pass}"`);
          if (user === creds.user && sha256(pass) === creds.pass) {
            createSession(res);
            sendJSON(res, 200, { ok: true });
          } else {
            sendJSON(res, 401, { ok: false, error: 'Incorrect username or password.' });
          }
          break;
        }

        case 'adminLogout': {
          destroySession(req, res);
          sendJSON(res, 200, { ok: true });
          break;
        }

        case 'getInquiries': {
          if (!sess) { sendJSON(res, 403, { error: 'Unauthorized.' }); break; }
          const data = await jsonbin('GET', INQUIRIES_BIN);
          sendJSON(res, 200, data?.record ?? {});
          break;
        }

        case 'saveShipments': {
          if (!sess) { sendJSON(res, 403, { error: 'Unauthorized.' }); break; }
          if (!Array.isArray(body.shipments)) { sendJSON(res, 400, { error: 'Bad payload.' }); break; }
          await jsonbin('PUT', SHIPMENTS_BIN, { shipments: body.shipments });
          sendJSON(res, 200, { ok: true });
          break;
        }

        case 'saveInquiries': {
          if (!sess) { sendJSON(res, 403, { error: 'Unauthorized.' }); break; }
          if (!Array.isArray(body.inquiries)) { sendJSON(res, 400, { error: 'Bad payload.' }); break; }
          await jsonbin('PUT', INQUIRIES_BIN, { inquiries: body.inquiries });
          sendJSON(res, 200, { ok: true });
          break;
        }

        case 'changePassword': {
          if (!sess) { sendJSON(res, 403, { error: 'Unauthorized.' }); break; }
          const creds = getCreds();
          if (sha256(body.oldPass) !== creds.pass) {
            sendJSON(res, 400, { ok: false, error: 'Current password is incorrect.' }); break;
          }
          if (!body.newPass || body.newPass.length < 6) {
            sendJSON(res, 400, { ok: false, error: 'Password must be at least 6 characters.' }); break;
          }
          creds.pass = sha256(body.newPass);
          saveCreds(creds);
          sendJSON(res, 200, { ok: true });
          break;
        }

        default:
          sendJSON(res, 400, { error: `Unknown action: ${action}` });
      }
    } catch (err) {
      console.error('Proxy error:', err.message);
      sendJSON(res, 502, { error: 'Server error. Please try again.' });
    }
    return;
  }

  // ── STATIC FILES ───────────────────────────────────────────────────────────
  let reqPath = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.join(__dirname, reqPath);

  // Block path traversal
  if (!filePath.startsWith(__dirname + path.sep) && filePath !== __dirname) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Serve index.html as fallback
      fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`ZipCargo running on port ${PORT}`);
});
