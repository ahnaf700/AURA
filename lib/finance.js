export const KATEGORI = [
  'Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan & Utilitas',
  'Hiburan', 'Kesehatan', 'Pendidikan', 'Tabungan & Investasi',
  'Gaji', 'Bisnis', 'Lainnya',
];

export const MAX_TX_PER_MESSAGE = 20;

export const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');

/** Output AI tidak dipercaya: validasi ulang semuanya. */
export function normalizeTransactions(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const t of raw.slice(0, MAX_TX_PER_MESSAGE)) {
    const tipe = t && (t.Tipe === 'Pemasukan' || t.Tipe === 'Pengeluaran') ? t.Tipe : null;
    const nominal = Math.round(Number(t && t.Nominal));
    if (!tipe || !Number.isFinite(nominal) || nominal <= 0 || nominal >= 1e12) continue;
    out.push({
      Tipe: tipe,
      Kategori: KATEGORI.includes(t.Kategori) ? t.Kategori : 'Lainnya',
      Nominal: nominal,
      Keterangan: String(t.Keterangan || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120),
    });
  }
  return out;
}

const ID_RE = /^[A-Za-z0-9_-]{20,100}$/;
export const isSheetId = (s) => ID_RE.test(String(s || ''));

/** Terima link Google Sheets penuh atau ID mentah. */
export function parseSpreadsheetId(input) {
  const s = String(input || '').trim().slice(0, 500);
  const m = s.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([A-Za-z0-9_-]{20,100})/);
  if (m) return m[1];
  return ID_RE.test(s) ? s : null;
}

export const isMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || ''));
