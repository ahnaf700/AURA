const REQUIRED = [
  'GEMINI_API_KEY',
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY',
  'GAS_WEB_APP_URL', 'GAS_SHARED_SECRET',
  'META_ACCESS_TOKEN', 'META_PHONE_NUMBER_ID', 'META_APP_SECRET', 'META_VERIFY_TOKEN',
];

/**
 * Dipanggil sekali saat server start (instrumentation.js).
 * - Variabel wajib hilang  -> error di semua mode.
 * - Konfigurasi lemah/salah -> error di production, peringatan di development.
 */
export function validateEnv() {
  const e = process.env;
  const missing = REQUIRED.filter((k) => !e[k]);
  if (missing.length) throw new Error('[AURA] ENV belum lengkap: ' + missing.join(', '));

  const problems = [];
  if (e.META_VERIFY_TOKEN.length < 24) problems.push('META_VERIFY_TOKEN terlalu pendek (min 24 karakter acak). Jalankan: npm run gen-secrets');
  if (e.GAS_SHARED_SECRET.length < 32) problems.push('GAS_SHARED_SECRET terlalu pendek (min 32 karakter acak). Jalankan: npm run gen-secrets');
  if (e.SUPABASE_SERVICE_KEY === e.NEXT_PUBLIC_SUPABASE_ANON_KEY || /^sb_publishable_/.test(e.SUPABASE_SERVICE_KEY)) {
    problems.push('SUPABASE_SERVICE_KEY berisi anon/publishable key. Pakai secret key (sb_secret_...).');
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(e.GAS_WEB_APP_URL)) {
    problems.push('GAS_WEB_APP_URL harus URL Web App Apps Script yang berakhir /exec.');
  }
  if (!/^\d{8,15}$/.test(e.NEXT_PUBLIC_BOT_WA_NUMBER || '')) {
    problems.push('NEXT_PUBLIC_BOT_WA_NUMBER belum diisi dengan nomor asli (format 628..., tanpa +).');
  }
  const leaked = Object.keys(e).filter((k) => k.startsWith('NEXT_PUBLIC_') && /(SECRET|SERVICE|PRIVATE|ACCESS_TOKEN)/i.test(k));
  if (leaked.length) problems.push('Variabel rahasia berawalan NEXT_PUBLIC_ akan bocor ke browser: ' + leaked.join(', '));

  if (problems.length) {
    const msg = '[AURA] Konfigurasi tidak aman:\n - ' + problems.join('\n - ');
    if (e.NODE_ENV === 'production') throw new Error(msg);
    console.error(msg);
  }
}
