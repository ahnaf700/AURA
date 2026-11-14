import { after } from 'next/server';
import { safeEqual } from '@/lib/security';
import { handleIncoming } from '@/lib/handleMessage';

export const dynamic = 'force-dynamic';

const OK = () => new Response('OK', { status: 200 });

// Webhook Telegram. Telegram menyertakan header rahasia (secret_token) yang kita set saat setWebhook;
// tanpa itu permintaan ditolak. Hanya chat pribadi (bukan grup/kanal) yang diproses.
export async function POST(req) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!secret || !safeEqual(secret, got)) return new Response('Forbidden', { status: 403 });

  const raw = await req.text();
  if (raw.length > 100_000) return new Response('Too large', { status: 413 });
  let update;
  try {
    update = JSON.parse(raw);
  } catch {
    return OK();
  }

  const m = update?.message;
  if (!m || update.update_id == null || m.chat?.type !== 'private' || m.from?.is_bot) return OK();

  // Balas 200 secepatnya (Telegram me-retry bila lambat); proses AI di belakang.
  after(async () => {
    try {
      await handleIncoming({
        channel: 'telegram',
        id: `tg:${update.update_id}`,
        from: String(m.chat.id),
        text: typeof m.text === 'string' ? m.text : null,
      });
    } catch (err) {
      console.error('Error proses pesan Telegram:', err.message);
    }
  });
  return OK();
}
