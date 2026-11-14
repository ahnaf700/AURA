import { sendWhatsAppMessage } from './whatsapp';
import { sendTelegramMessage } from './telegram';

/**
 * Daftar saluran chat. Menambah saluran baru = menambah satu entri di sini
 * (+ satu kolom di tabel users + satu route webhook).
 *  - column : kolom di tabel users yang menyimpan ID chat/nomor
 *  - valid  : validasi ID dari saluran itu
 *  - key    : kunci untuk dedup/rate-limit (dipisah antarsaluran agar tidak bentrok)
 */
export const CHANNELS = {
  whatsapp: {
    label: 'WhatsApp',
    column: 'no_whatsapp',
    valid: (id) => /^\d{8,15}$/.test(id),
    key: (id) => id,
    send: sendWhatsAppMessage,
  },
  telegram: {
    label: 'Telegram',
    column: 'telegram_chat_id',
    valid: (id) => /^\d{1,15}$/.test(id),
    key: (id) => `tg:${id}`,
    send: sendTelegramMessage,
  },
};
