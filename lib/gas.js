/** Panggil Google Apps Script (jembatan ke Spreadsheet pengguna). */
export async function callGas(payload) {
  const res = await fetch(process.env.GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ secret: process.env.GAS_SHARED_SECRET, ...payload }),
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`GAS HTTP ${res.status}`);
  let data;
  const raw = await res.text();
  try {
    data = JSON.parse(raw);
  } catch {
    // Biasanya halaman error HTML dari Google; ambil teksnya agar penyebab terbaca di log.
    const teks = raw
      .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    throw new Error(`GAS membalas non-JSON (HTTP ${res.status}): ${teks}`);
  }
  if (!data || data.ok !== true) {
    const err = new Error('GAS: ' + (data && data.error));
    err.code = data && data.error;
    throw err;
  }
  return data;
}
