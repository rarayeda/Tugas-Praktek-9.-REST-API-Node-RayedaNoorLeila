'use strict';
const crypto = require('crypto');
const path = require('path');
const API_KEY = process.env.IOT_API_KEY;
if (!API_KEY || !process.env.NODE_RED_CREDENTIAL_SECRET) {
  throw new Error('IOT_API_KEY dan NODE_RED_CREDENTIAL_SECRET harus diatur via .env');
}
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const lhs = Buffer.from(a, 'utf8');
  const rhs = Buffer.from(b, 'utf8');
  return lhs.length === rhs.length && crypto.timingSafeEqual(lhs, rhs);
}
module.exports = {
  uiHost: '127.0.0.1',
  uiPort: process.env.PORT || 1880,
  flowFile: 'flows.json',
  flowFilePretty: true,
  httpAdminRoot: '/red',
  httpStatic: [{ path: path.join(__dirname, 'public'), root: '/dashboard/' }],
  credentialSecret: process.env.NODE_RED_CREDENTIAL_SECRET,
  functionGlobalContext: { apiKey: API_KEY },
  contextStorage: { default: { module: 'memory' } },
  httpNodeMiddleware: (req, res, next) => {
    // HTTP API lokal dilindungi header X-API-Key; halaman statis tidak diblokir.
    if (req.path && req.path.startsWith('/api/') && req.path !== '/api/health') {
      if (!constantTimeEqual(req.get('X-API-Key'), API_KEY)) {
        return res.status(401).json({ status: 'error', message: 'X-API-Key tidak valid' });
      }
    }
    res.setHeader('Cache-Control', 'no-store');
    return next();
  },
  logging: { console: { level: 'info', metrics: false, audit: false } }
};
