import { admin } from './supabase/admin';
import { callGas } from './gas';
import { extractFromText, adviseUser } from './ai';
import { sendWhatsAppMessage } from './whatsapp';
import { normalizeTransactions, rp } from './finance';
import { maskNo } from './security';

const MAX_INPUT_CHARS = 1000;
const RATE_MAX = 20;
const RATE_WINDOW_MS = 5 * 60_000;

/** Dedup (Meta bisa retry) + rate limit per nomor, disimpan di DB agar tahan serverless. */
async function claimMessage(id, no) {
  const db = admin();
  const { error } = await db.from('processed_messages').insert({ id, wa_number: no });
  if (error) {
    if (error.code === '23505') return 'duplicate';
    throw new Error('claim: ' + error.message);
  }
  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await db
    .from('processed_messages')
    .select('id', { count: 'exact', head: true })
    .eq('wa_number', no)
    .gte('created_at', since);
  if ((count ?? 0) > RATE_MAX) return 'limited';
  if (Math.random() < 0.02) {
    await db.from('processed_messages').delete().lt('created_at', new Date(Date.now() - 864e5).toISOString());
  }
  return 'ok';
}

/** Tautkan nomor WA ke akun dashboard lewat kode sekali pakai (bukti pemilik nomor). */
async function tryLink(no, code) {
  const db = admin();
  const { data: u } = await db
    .from('users')
    .select('id, link_code_expires')
    .eq('link_code', code)
    .maybeSingle();
  if (!u || !u.link_code_expires || new Date(u.link_code_expires) < new Date()) {
    await sendWhatsAppMessage(no, 'Kode tidak valid atau sudah kedaluwarsa, Kak. Buat kode baru di dashboard AURA ya.');
    return;
  }
  const { error } = await db
    .from('users')
    .update({ no_whatsapp: no, link_code: null, link_code_expires: null })
    .eq('id', u.id);
  if (error) {
    const msg =
      error.code === '23505'
        ? 'Nomor ini sudah terhubung ke akun AURA lain, Kak.'
        : 'Maaf Kak, gagal menautkan nomor. Coba lagi sebentar ya.';
    await sendWhatsAppMessage(no, msg);
    return;
  }
  await sendWhatsAppMessage(
    no,
    '✅ Nomor berhasil terhubung ke AURA!\n\nSekarang coba kirim: _"Beli kopi 20rb"_. Kakak juga bisa tanya _"bulan ini gimana?"_ atau minta tips hemat 😊',
  );
}

export async function handleMessage(msg) {
  const no = String(msg?.from || '');
  if (!/^\d{8,15}$/.test(no) || !msg.id) return;

  const claim = await claimMessage(msg.id, no);
  if (claim !== 'ok') {
    if (claim === 'limited') console.warn('Rate limit:', maskNo(no));
    return;
  }

  if (msg.type !== 'text' || typeof msg.text?.body !== 'string') {
    await sendWhatsAppMessage(no, 'Saat ini AURA baru bisa membaca pesan teks ya, Kak 🙏');
    return;
  }
  const teks = msg.text.body.trim().slice(0, MAX_INPUT_CHARS);
  if (!teks) return;
  console.log(`Pesan dari ${maskNo(no)} (${teks.length} karakter)`); // isi pesan tidak di-log

  const codeMatch = teks.match(/^AURA-([A-Z0-9]{6})$/i);
  if (codeMatch) return tryLink(no, 'AURA-' + codeMatch[1].toUpperCase());

  const { data: user } = await admin()
    .from('users')
    .select('spreadsheet_id')
    .eq('no_whatsapp', no)
    .maybeSingle();
  if (!user) {
    await sendWhatsAppMessage(no, 'Halo! Nomor ini belum terhubung ke AURA. Daftar dan tautkan nomor lewat dashboard dulu ya, Kak.');
    return;
  }
  if (!user.spreadsheet_id) {
    await sendWhatsAppMessage(no, 'Google Sheets Kakak belum terhubung. Selesaikan langkahnya di dashboard AURA ya.');
    return;
  }

  // --- Tahap A: ekstraksi ---
  let extracted;
  try {
    extracted = await extractFromText(teks);
  } catch (err) {
    console.error('Ekstraksi gagal:', err.message);
    await sendWhatsAppMessage(no, 'Maaf Kak, AURA lagi kesulitan membaca pesannya. Coba kirim ulang sebentar lagi ya 🙏');
    return;
  }
  const intent = ['catat', 'ringkasan', 'saran', 'obrolan'].includes(extracted.intent) ? extracted.intent : 'obrolan';
  const transaksi = normalizeTransactions(extracted.transaksi);

  // --- Pencatatan: konfirmasi dibuat oleh kode, bukan AI ---
  let konfirmasi = '';
  let tercatat = false;
  if (transaksi.length > 0) {
    try {
      await callGas({ action: 'append', spreadsheet_id: user.spreadsheet_id, transactions: transaksi });
      tercatat = true;
      konfirmasi =
        '✅ *Tercatat:*\n' +
        transaksi.map((t) => `• ${t.Tipe} – ${t.Keterangan || t.Kategori}: ${rp(t.Nominal)}`).join('\n');
    } catch (err) {
      console.error('Gagal tulis ke Sheets:', err.message);
      konfirmasi =
        '⚠️ Maaf Kak, transaksinya *belum berhasil tercatat* di Google Sheets. Pastikan Sheet masih di-share ke email bot sebagai Editor, lalu kirim ulang.';
    }
  }

  // --- Tahap B: penasihat finansial ---
  let dataKeuangan = null;
  if (tercatat || intent === 'ringkasan' || intent === 'saran') {
    try {
      dataKeuangan = (await callGas({ action: 'summary', spreadsheet_id: user.spreadsheet_id })).summary || null;
    } catch (err) {
      console.error('Gagal ambil ringkasan:', err.message);
    }
  }

  let advice = '';
  if (!(transaksi.length > 0 && !tercatat)) {
    try {
      advice = await adviseUser({
        pesan_pengguna: teks,
        transaksi_baru: tercatat ? transaksi : [],
        data_keuangan: dataKeuangan,
      });
    } catch (err) {
      console.error('Advisor gagal:', err.message);
      if (!konfirmasi) advice = 'Maaf Kak, AURA lagi sibuk. Coba lagi sebentar ya 🙏';
    }
  }

  await sendWhatsAppMessage(no, [konfirmasi, advice].filter(Boolean).join('\n\n'));
}
