require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const compression  = require('compression');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path         = require('path');
const https        = require('https');

const connectDB = require('./config/db');
const Admin     = require('./models/Admin');

connectDB();

async function seedAdmin() {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      await Admin.create({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'zipcargo2026',
        role:     'superadmin',
      });
      console.log('✅ Default admin seeded.');
    }
  } catch (e) {
    console.error('Seed error:', e.message);
  }
}
seedAdmin();

const app = express();

// Trust proxy (needed for Render)
app.set('trust proxy', 1);

// Allow ALL origins — fixes the CORS issue
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use('/api/', rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/login', rateLimit({
  windowMs: 60_000, max: 10,
  message: { error: 'Too many login attempts. Try again in 1 minute.' },
}));

app.use(compression());
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/activity',  require('./routes/activity'));

app.get('/health', (_, res) => res.send('OK'));

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 ZipCargo running on port ${PORT}`));

if (process.env.SITE_URL) {
  setInterval(() => {
    try {
      const u = new URL(process.env.SITE_URL + '/health');
      https.get({ hostname: u.hostname, path: u.pathname, timeout: 10000 }, r =>
        console.log(`[keep-alive] ${r.statusCode}`)
      ).on('error', e => console.warn('[keep-alive]', e.message));
    } catch {}
  }, 14 * 60 * 1000);
}
