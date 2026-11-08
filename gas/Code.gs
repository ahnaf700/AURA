/**
 * AURA – Google Apps Script (jembatan ke Spreadsheet pengguna)
 *
 * SETUP (sekali, dengan akun Google BOT):
 * 1. Project Settings > Script Properties > tambah SHARED_SECRET (string acak panjang,
 *    sama persis dengan GAS_SHARED_SECRET di backend).
 * 2. Project Settings > centang "Show appsscript.json", pastikan "timeZone": "Asia/Jakarta".
 * 3. Deploy > New deployment > Web app > Execute as: Me | Who has access: Anyone
 *    (akses tetap dilindungi SHARED_SECRET). Salin URL-nya ke GAS_WEB_APP_URL.
 * 4. Setiap mengubah kode, buat deployment versi BARU agar perubahan aktif.
 *
 * Opsional: Script Property OWNER_CHECK=off mematikan pengecekan "email pemilik/editor"
 * (TIDAK DISARANKAN; hanya jika Google menyembunyikan email editor di akunmu).
 *
 * Struktur sheet "Transaksi": A Tanggal | B Tipe | C Kategori | D Nominal | E Keterangan
 */

var SHEET_NAME = 'Transaksi';
var HEADERS = ['Tanggal', 'Tipe', 'Kategori', 'Nominal', 'Keterangan'];
var MAX_ROWS_PER_APPEND = 20;
var MAX_ROWS_SCANNED = 3000;
var MAX_ROWS_LIST = 1000;
var KATEGORI_OK = [
  'Makanan & Minuman', 'Transportasi', 'Belanja', 'Tagihan & Utilitas',
  'Hiburan', 'Kesehatan', 'Pendidikan', 'Tabungan & Investasi',
  'Gaji', 'Bisnis', 'Lainnya'
];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!secret || !safeEqual_(String(body.secret || ''), secret)) return out_({ ok: false, error: 'unauthorized' });

    var id = String(body.spreadsheet_id || '');
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(id)) return out_({ ok: false, error: 'bad_spreadsheet_id' });

    switch (body.action) {
      case 'setup':   return out_(setup_(id, body.user_email));
      case 'append':  return out_(appendTx_(id, body.transactions));
      case 'summary': return out_(summary_(id));
      case 'list':    return out_(list_(id, String(body.month || '')));
      default:        return out_({ ok: false, error: 'unknown_action' });
    }
  } catch (err) {
    console.error(err);
    return out_({ ok: false, error: 'server_error' }); // jangan bocorkan detail
  }
}

/** Validasi akses + pastikan sheet "Transaksi" ada. */
function setup_(id, userEmail) {
  var ss;
  try { ss = SpreadsheetApp.openById(id); } catch (e) { return { ok: false, error: 'no_access' }; }
  if (!userHasAccess_(ss, userEmail)) return { ok: false, error: 'not_editor' };

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return { ok: true };
}

/** Email login pengguna harus pemilik/editor Sheet (mencegah klaim Sheet milik orang lain). */
function userHasAccess_(ss, email) {
  if (PropertiesService.getScriptProperties().getProperty('OWNER_CHECK') === 'off') return true;
  var want = String(email || '').trim().toLowerCase();
  if (!want) return false;
  var people = [ss.getOwner()].concat(ss.getEditors());
  for (var i = 0; i < people.length; i++) {
    if (people[i] && String(people[i].getEmail()).toLowerCase() === want) return true;
  }
  return false;
}

function appendTx_(id, txs) {
  if (!Array.isArray(txs) || txs.length === 0) return { ok: false, error: 'no_transactions' };

  var rows = [];
  txs.slice(0, MAX_ROWS_PER_APPEND).forEach(function (t) {
    var tipe = t && (t.Tipe === 'Pemasukan' || t.Tipe === 'Pengeluaran') ? t.Tipe : null;
    var nominal = Math.round(Number(t && t.Nominal));
    if (!tipe || !isFinite(nominal) || nominal <= 0) return;
    var kategori = KATEGORI_OK.indexOf(t.Kategori) >= 0 ? t.Kategori : 'Lainnya';
    rows.push([new Date(), tipe, kategori, nominal, String(t.Keterangan || '').slice(0, 120)]);
  });
  if (rows.length === 0) return { ok: false, error: 'no_valid_rows' };

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
    if (!sheet) return { ok: false, error: 'sheet_not_found' };
    var start = sheet.getLastRow() + 1;
    // Cegah formula injection: kolom teks dipaksa plain text SEBELUM diisi.
    sheet.getRange(start, 2, rows.length, 2).setNumberFormat('@');
    sheet.getRange(start, 5, rows.length, 1).setNumberFormat('@');
    sheet.getRange(start, 1, rows.length, 1).setNumberFormat('yyyy-mm-dd hh:mm');
    sheet.getRange(start, 4, rows.length, 1).setNumberFormat('#,##0');
    sheet.getRange(start, 1, rows.length, 5).setValues(rows);
    return { ok: true, added: rows.length };
  } finally {
    lock.releaseLock();
  }
}

function readRows_(id) {
  var sheet = SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
  if (!sheet) return null;
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var startRow = Math.max(2, last - MAX_ROWS_SCANNED + 1);
  return sheet.getRange(startRow, 1, last - startRow + 1, 5).getValues();
}

/** Ringkasan untuk AI penasihat. Sengaja TANPA kolom Keterangan (teks bebas) agar aman dari prompt injection. */
function summary_(id) {
  var values = readRows_(id);
  if (values === null) return { ok: false, error: 'sheet_not_found' };

  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var thisKey = Utilities.formatDate(now, tz, 'yyyy-MM');
  var prevKey = Utilities.formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), tz, 'yyyy-MM');

  var s = {
    hari_berjalan: Number(Utilities.formatDate(now, tz, 'd')),
    hari_dalam_bulan: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    bulan_ini: { pemasukan: 0, pengeluaran: 0, saldo: 0, per_kategori: {} },
    bulan_lalu: { pemasukan: 0, pengeluaran: 0, saldo: 0, per_kategori: {} }
  };
  values.forEach(function (r) {
    if (!(r[0] instanceof Date)) return;
    var key = Utilities.formatDate(r[0], tz, 'yyyy-MM');
    var nominal = Number(r[3]);
    if (!isFinite(nominal)) return;
    var b = key === thisKey ? s.bulan_ini : key === prevKey ? s.bulan_lalu : null;
    if (!b) return;
    if (r[1] === 'Pemasukan') b.pemasukan += nominal;
    else if (r[1] === 'Pengeluaran') {
      b.pengeluaran += nominal;
      var k = String(r[2] || 'Lainnya');
      b.per_kategori[k] = (b.per_kategori[k] || 0) + nominal;
    }
  });
  s.bulan_ini.saldo = s.bulan_ini.pemasukan - s.bulan_ini.pengeluaran;
  s.bulan_lalu.saldo = s.bulan_lalu.pemasukan - s.bulan_lalu.pengeluaran;
  return { ok: true, summary: s };
}

/** Daftar transaksi 1 bulan (yyyy-MM) untuk dashboard web. */
function list_(id, month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { ok: false, error: 'bad_month' };
  var values = readRows_(id);
  if (values === null) return { ok: false, error: 'sheet_not_found' };

  var tz = Session.getScriptTimeZone();
  var rows = [];
  values.forEach(function (r) {
    if (!(r[0] instanceof Date)) return;
    if (Utilities.formatDate(r[0], tz, 'yyyy-MM') !== month) return;
    var nominal = Number(r[3]);
    if (!isFinite(nominal)) return;
    if (r[1] !== 'Pemasukan' && r[1] !== 'Pengeluaran') return;
    rows.push({
      tanggal: Utilities.formatDate(r[0], tz, 'yyyy-MM-dd HH:mm'),
      tipe: r[1],
      kategori: String(r[2] || 'Lainnya'),
      nominal: nominal,
      keterangan: String(r[4] || '')
    });
  });
  rows.reverse(); // terbaru di atas
  var truncated = rows.length > MAX_ROWS_LIST;
  return { ok: true, rows: rows.slice(0, MAX_ROWS_LIST), truncated: truncated };
}

function safeEqual_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
