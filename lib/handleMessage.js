import { admin } from './supabase/admin';
import { callGas } from './gas';
import { extractFromText, adviseUser } from './ai';
import { CHANNELS } from './channels';
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

/** Tautkan chat (WhatsApp/Telegram) ke akun dashboard lewat kode sekali pakai (bukti pemilik chat). */
async function tryLink(ch, from, code) {
  const db = admin();
  const { data: u } = await db
    .from('users')
    .select('id, link_code_expires')
    .eq('link_code', code)
    .maybeSingle();
  if (!u || !u.link_code_expires || new Date(u.link_code_expires) < new Date()) {
    await ch.send(from, 'Kode tidak valid atau sudah kedaluwarsa, Kak. Buat kode baru di dashboard AURA ya.');
    return;
  }
  const { error } = await db
    .from('users')
    .update({ [ch.column]: from, link_code: null, link_code_expires: null })
    .eq('id', u.id);
  if (error) {
    const msg =
      error.code === '23505'
        ? `Akun ${ch.label} ini sudah terhubung ke akun AURA lain, Kak.`
        : 'Maaf Kak, gagal menautkan. Coba lagi sebentar ya.';
    await ch.send(from, msg);
    return;
  }
  await ch.send(
    from,
    `✅ ${ch.label} berhasil terhubung ke AURA!\n\nSekarang coba kirim: _"Beli kopi 20rb"_. Kakak juga bisa tanya _"bulan ini gimana?"_ atau minta tips hemat 😊`,
  );
}

/** Pintu masuk WhatsApp (format pesan Meta). */
export async function handleMessage(msg) {
  return handleIncoming({
    channel: 'whatsapp',
    id: msg?.id,
    from: String(msg?.from || ''),
    text: msg?.type === 'text' && typeof msg.text?.body === 'string' ? msg.text.body : null,
  });
}

/** Pemrosesan pesan yang sama untuk semua saluran. text = null bila bukan pesan teks. */
export async function handleIncoming({ channel, id, from, text }) {
  const ch = CHANNELS[channel];
  if (!ch || !ch.valid(from) || !id) return;
  const no = from;

  const claim = await claimMessage(id, ch.key(from));
  if (claim !== 'ok') {
    if (claim === 'limited') console.warn('Rate limit:', channel, maskNo(no));
    return;
  }

  if (typeof text !== 'string') {
    await ch.send(no, 'Saat ini AURA baru bisa membaca pesan teks ya, Kak 🙏');
    return;
  }
  const teks = text.trim().slice(0, MAX_INPUT_CHARS);
  if (!teks) return;
  console.log(`Pesan ${channel} dari ${maskNo(no)} (${teks.length} karakter)`); // isi pesan tidak di-log

  // Telegram mengirim "/start AURA-XXXXXX" saat pengguna menekan tautan dari dashboard.
  const body = teks.replace(/^\/start(?:@\w+)?\s*/i, '');
  const codeMatch = body.match(/^AURA-([A-Z0-9]{6})$/i);
  if (codeMatch) return tryLink(ch, no, 'AURA-' + codeMatch[1].toUpperCase());
  if (/^\/start/i.test(teks)) {
    await ch.send(no, 'Halo! Aku AURA, asisten pencatat keuangan 😊\n\nBuat kode tautan di dashboard AURA, lalu kirim kodenya ke sini. Setelah itu cukup ketik pengeluaranmu, misalnya _"makan siang 25rb"_.');
    return;
  }

  const { data: user } = await admin()
    .from('users')
    .select('spreadsheet_id')
    .eq(ch.column, no)
    .maybeSingle();
  if (!user) {
    await ch.send(no, 'Halo! Chat ini belum terhubung ke AURA. Daftar dan tautkan lewat dashboard dulu ya, Kak.');
    return;
  }
  if (!user.spreadsheet_id) {
    await ch.send(no, 'Google Sheets Kakak belum terhubung. Selesaikan langkahnya di dashboard AURA ya.');
    return;
  }

  // --- Tahap A: ekstraksi ---
  let extracted;
  try {
    extracted = await extractFromText(teks);
  } catch (err) {
    console.error('Ekstraksi gagal:', err.message);
    await ch.send(no, 'Maaf Kak, AURA lagi kesulitan membaca pesannya. Coba kirim ulang sebentar lagi ya 🙏');
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

  await ch.send(no, [konfirmasi, advice].filter(Boolean).join('\n\n'));
}
