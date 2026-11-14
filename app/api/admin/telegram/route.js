import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/admin';
import { admin } from '@/lib/supabase/admin';
import { sameOrigin } from '@/lib/security';
import { telegramApi } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// Status bot + webhook (token tidak pernah dikirim ke browser).
export async function GET() {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ configured: false });

  const [bot, hook] = await Promise.all([telegramApi('getMe'), telegramApi('getWebhookInfo')]);
  if (!bot.ok) {
    return NextResponse.json({ configured: true, valid: false, error: 'Token bot ditolak Telegram. Periksa TELEGRAM_BOT_TOKEN.' });
  }
  return NextResponse.json({
    configured: true,
    valid: true,
    username: bot.result?.username || null,
    webhookUrl: hook.result?.url || null,
    pending: hook.result?.pending_update_count ?? 0,
    lastError: hook.result?.last_error_message || null,
    secretSet: (process.env.TELEGRAM_WEBHOOK_SECRET || '').length >= 24,
  });
}

// Pasang / perbarui webhook Telegram ke situs ini.
export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || '';
  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN belum diisi di Vercel.' }, { status: 400 });
  if (secret.length < 24 || !/^[A-Za-z0-9_-]+$/.test(secret)) {
    return NextResponse.json({ error: 'TELEGRAM_WEBHOOK_SECRET belum valid (min 24 karakter: huruf, angka, _ atau -).' }, { status: 400 });
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const url = `${base}/api/telegram`;
  const r = await telegramApi('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });
  if (!r.ok) {
    console.error('setWebhook gagal:', r.description);
    return NextResponse.json({ error: `Telegram menolak: ${r.description || 'tidak diketahui'}` }, { status: 502 });
  }
  await admin().from('admin_log').insert({ admin_email: me.email, action: 'telegram_webhook', target_email: null });
  return NextResponse.json({ ok: true, url });
}
