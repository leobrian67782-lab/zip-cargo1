/**
 * ZipCargo – Node.js Proxy Server
 * ================================
 * Runs on Render.com. Keeps your JSONBin key 100% server-side.
 * Serves all your static files (index.html, style.css, etc.) too.
 *
 * DEFAULT LOGIN:  admin / zipcargo2026
 * Change it via the admin Settings panel after first login.
 */

const http    = require('http');
const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const PORT           = process.env.PORT || 3000;
const JSONBIN_KEY    = process.env.JSONBIN_KEY    || '$2a$10$W1QgCI2lUG0iDnjaWSI0MOeg6/PWuAJqnQ9UcqGvxvyED89713Y.W';
const SHIPMENTS_BIN  = process.env.SHIPMENTS_BIN  || '69fbdb43adc21f119a6408ab';
const INQUIRIES_BIN  = process.env.INQUIRIES_BIN  || '69fbdbd4adc21f119a640d71';
const JSONBIN_BASE   = 'https://api.jsonbin.io/v3';
const SESSION_SECRET = process.env.SESSION_SECRET || 'zc_secret_change_me_2026';
const CREDS_FILE     = path.join(__dirname, '.zc_credentials.json');

// ── SESSION STORE (in-memory, survives normal requests) ───────────────────────
const sessions = {};
function makeSessionId() { return crypto.randomBytes(32).toString('hex'); }
function getSession(req) {
  const cookie = (req.headers.cookie || '').split(';').map(c => c.trim());
  const sid = cookie.find(c => c.startsWith('zc_sid='))?.split('=')[1];
  return sid ? sessions[sid] : null;
}
function createSession(res) {
  const sid = makeSessionId();
  sessions[sid] = { admin: true, created: Date.now() };
  res.setHeader('Set-Cookie', `zc_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  return sid;
}
function destroySession(req, res) {
  const cookie = (req.headers.cookie || '').split(';').map(c => c.trim());
  const sid = cookie.find(c => c.startsWith('zc_sid='))?.split('=')[1];
  if (sid) delete sessions[sid];
  res.setHeader('Set-Cookie', 'zc_sid=; Path=/; HttpOnly; Max-Age=0');
}

// ── CREDENTIALS ───────────────────────────────────────────────────────────────
function getCreds() {
  try {
    if (fs.existsSync(CREDS_FILE)) return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  } catch {}
  // Default — password stored as SHA-256 hash
  return { user: 'admin', pass: sha256('zipcargo2026') };
}
function saveCreds(c) { fs.writeFileSync(CREDS_FILE, JSON.stringify(c)); }
function sha256(str) { return crypto.createHash('sha256').update(str).digest('hex'); }

// ── JSONBIN HELPER ────────────────────────────────────────────────────────────
function jsonbin(method, binId, payload) {
  return new Promise((resolve, reject) => {
    const url     = `${JSONBIN_BASE}/b/${binId}${method === 'GET' ? '/latest' : ''}`;
    const body    = payload ? JSON.stringify(payload) : null;
    const options = {
      method,
      headers: {
        'X-Master-Key':  JSONBIN_KEY,
        'Content-Type':  'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    };
    const req = https.request(url, options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

// ── MIME TYPES ────────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};

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

// ── READ REQUEST BODY ─────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 1e6) data = ''; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
  });
}

// ── JSON RESPONSE ─────────────────────────────────────────────────────────────
function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// ── MAIN SERVER ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const ip  = req.socket.remoteAddress || 'unknown';
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── API PROXY (/proxy?action=...) ──────────────────────────────────────────
  if (url.pathname === '/proxy') {
    if (!rateOk(ip)) { json(res, 429, { error: 'Too many requests.' }); return; }

    const action = url.searchParams.get('action') || '';
    const body   = req.method === 'POST' ? await readBody(req) : {};
    const sess   = getSession(req);

    try {
      switch (action) {

        case 'getShipments': {
          const data = await jsonbin('GET', SHIPMENTS_BIN);
          json(res, 200, data?.record ?? {});
          break;
        }

        case 'saveInquiry': {
          const inq = body.inquiry;
          if (!inq?.name || !inq?.email) { json(res, 400, { error: 'Missing fields.' }); break; }
          // Sanitise
          ['name','email','service','message'].forEach(f => {
            inq[f] = String(inq[f] || '').replace(/<[^>]*>/g, '').slice(0, 500);
          });
          const data = await jsonbin('GET', INQUIRIES_BIN);
          const list = data?.record?.inquiries ?? [];
          list.push(inq);
          await jsonbin('PUT', INQUIRIES_BIN, { inquiries: list });
          json(res, 200, { ok: true });
          break;
        }

        case 'adminLogin': {
          const { user, pass } = body;
          const creds = getCreds();
          if (user === creds.user && sha256(pass) === creds.pass) {
            createSession(res);
            json(res, 200, { ok: true });
          } else {
            json(res, 401, { ok: false, error: 'Incorrect username or password.' });
          }
          break;
        }

        case 'adminLogout': {
          destroySession(req, res);
          json(res, 200, { ok: true });
          break;
        }

        case 'getInquiries': {
          if (!sess) { json(res, 403, { error: 'Unauthorized.' }); break; }
          const data = await jsonbin('GET', INQUIRIES_BIN);
          json(res, 200, data?.record ?? {});
          break;
        }

        case 'saveShipments': {
          if (!sess) { json(res, 403, { error: 'Unauthorized.' }); break; }
          if (!Array.isArray(body.shipments)) { json(res, 400, { error: 'Bad payload.' }); break; }
          await jsonbin('PUT', SHIPMENTS_BIN, { shipments: body.shipments });
          json(res, 200, { ok: true });
          break;
        }

        case 'saveInquiries': {
          if (!sess) { json(res, 403, { error: 'Unauthorized.' }); break; }
          if (!Array.isArray(body.inquiries)) { json(res, 400, { error: 'Bad payload.' }); break; }
          await jsonbin('PUT', INQUIRIES_BIN, { inquiries: body.inquiries });
          json(res, 200, { ok: true });
          break;
        }

        case 'changePassword': {
          if (!sess) { json(res, 403, { error: 'Unauthorized.' }); break; }
          const creds = getCreds();
          if (sha256(body.oldPass) !== creds.pass) {
            json(res, 400, { ok: false, error: 'Current password is incorrect.' }); break;
          }
          if ((body.newPass || '').length < 6) {
            json(res, 400, { ok: false, error: 'New password must be at least 6 characters.' }); break;
          }
          creds.pass = sha256(body.newPass);
          saveCreds(creds);
          json(res, 200, { ok: true });
          break;
        }

        default:
          json(res, 400, { error: 'Unknown action.' });
      }
    } catch (err) {
      console.error('Proxy error:', err.message);
      json(res, 502, { error: 'Server error. Please try again.' });
    }
    return;
  }

  // ── STATIC FILE SERVER ─────────────────────────────────────────────────────
  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext      = path.extname(filePath).toLowerCase();
  const mimeType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Fall back to index.html for SPA-style routing
      fs.readFile(path.join(__dirname, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`ZipCargo server running on port ${PORT}`));
