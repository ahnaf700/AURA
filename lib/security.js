import crypto from 'node:crypto';

export const maskNo = (no) => `***${String(no).slice(-4)}`;

/** Perbandingan waktu-konstan (di-hash dulu agar panjang tidak bocor). */
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** Verifikasi X-Hub-Signature-256 dari Meta. */
export function validSignature(rawBody, header) {
  if (!process.env.META_APP_SECRET || !header || !header.startsWith('sha256=')) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', process.env.META_APP_SECRET).update(rawBody).digest('hex');
  return safeEqual(header, expected);
}

/** Perlindungan CSRF untuk endpoint yang mengubah data (cookie-auth): Origin harus sama dengan host. */
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Kode tautan WhatsApp: acak kriptografis, tanpa karakter yang mudah tertukar. */
export function makeLinkCode() {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return 'AURA-' + s;
}
