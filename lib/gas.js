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
  try {
    data = await res.json();
  } catch {
    throw new Error('GAS membalas non-JSON');
  }
  if (!data || data.ok !== true) {
    const err = new Error('GAS: ' + (data && data.error));
    err.code = data && data.error;
    throw err;
  }
  return data;
}
