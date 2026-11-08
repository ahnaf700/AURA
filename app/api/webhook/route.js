import { after } from 'next/server';
import { safeEqual, validSignature } from '@/lib/security';
import { handleMessage } from '@/lib/handleMessage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Verifikasi webhook Meta
export async function GET(req) {
  const p = new URL(req.url).searchParams;
  const mode = p.get('hub.mode') || '';
  const token = p.get('hub.verify_token') || '';
  const challenge = p.get('hub.challenge') || '';
  if (process.env.META_VERIFY_TOKEN && mode === 'subscribe' && safeEqual(token, process.env.META_VERIFY_TOKEN)) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } }); // bukan HTML
  }
  return new Response('Forbidden', { status: 403 });
}

// Pesan masuk
export async function POST(req) {
  const raw = await req.text();
  if (raw.length > 200_000) return new Response('Too large', { status: 413 });
  if (!validSignature(raw, req.headers.get('x-hub-signature-256'))) {
    console.warn('Webhook ditolak: signature tidak valid');
    return new Response('Forbidden', { status: 403 });
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response('OK', { status: 200 });
  }
  if (body?.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) {
    return new Response('OK', { status: 200 });
  }

  // Balas 200 secepatnya (Meta akan retry bila lambat); proses AI di belakang.
  after(async () => {
    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        for (const msg of change.value?.messages || []) {
          try {
            await handleMessage(msg);
          } catch (err) {
            console.error('Error proses pesan:', err.message);
          }
        }
      }
    }
  });
  return new Response('OK', { status: 200 });
}
