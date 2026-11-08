// Jalankan: npm run gen-secrets
// Mencetak nilai acak kriptografis untuk dipasang di .env.local / Vercel / Script Properties.
const crypto = require('crypto');
const hex = (n) => crypto.randomBytes(n).toString('hex');
console.log('META_VERIFY_TOKEN=' + hex(24) + '   # samakan di dashboard Meta (Webhook)');
console.log('GAS_SHARED_SECRET=' + hex(32) + '   # samakan di Apps Script > Script Properties > SHARED_SECRET');
