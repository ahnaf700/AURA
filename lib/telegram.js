const API = 'https://api.telegram.org';

/** Ubah format WhatsApp (*tebal*, _miring_) menjadi HTML Telegram, dengan escape aman. */
export function toTelegramHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/(^|[\s(])\*(\S(?:[^*\n]*\S)?)\*(?=[\s.,!?:;)]|$)/g, '$1<b>$2</b>')
    .replace(/(^|[\s(])_(\S(?:[^_\n]*\S)?)_(?=[\s.,!?:;)]|$)/g, '$1<i>$2</i>');
}

/** Panggil metode Bot API Telegram. Token tidak pernah keluar dari server. */
export async function telegramApi(method, payload) {
  const res = await fetch(`${API}/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
    signal: AbortSignal.timeout(10000),
  });
  return res.json().catch(() => ({ ok: false, description: 'Respons tidak valid' }));
}

export async function sendTelegramMessage(chatId, text) {
  try {
    const r = await telegramApi('sendMessage', {
      chat_id: chatId,
      text: toTelegramHtml(String(text).slice(0, 3500)),
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
    if (!r.ok) console.error('Gagal kirim Telegram:', r.error_code, r.description);
  } catch (err) {
    console.error('Gagal kirim Telegram:', err.message);
  }
}
