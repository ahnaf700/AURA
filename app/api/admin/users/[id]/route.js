import { NextResponse } from 'next/server';
import { currentAdmin, isAdminEmail } from '@/lib/admin';
import { admin } from '@/lib/supabase/admin';
import { sameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(['unlink_chat', 'reset_sheet', 'delete']);

export async function POST(req, { params }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'ID tidak valid.' }, { status: 400 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }
  const action = body?.action;
  if (!ACTIONS.has(action)) return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });

  const db = admin();
  const { data: target } = await db.from('users').select('id, auth_user_id, email').eq('id', id).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Pengguna tidak ditemukan.' }, { status: 404 });
  if (isAdminEmail(target.email)) {
    return NextResponse.json({ error: 'Akun admin tidak bisa diubah dari panel ini.' }, { status: 400 });
  }

  let error;
  if (action === 'unlink_chat') {
    ({ error } = await db.from('users').update({ no_whatsapp: null, telegram_chat_id: null, link_code: null, link_code_expires: null }).eq('id', id));
  } else if (action === 'reset_sheet') {
    ({ error } = await db.from('users').update({ spreadsheet_id: null }).eq('id', id));
  } else {
    ({ error } = await db.auth.admin.deleteUser(target.auth_user_id)); // baris users ikut terhapus (cascade)
  }
  if (error) {
    console.error('Aksi admin gagal:', action, error.message);
    return NextResponse.json({ error: 'Aksi gagal. Coba lagi.' }, { status: 500 });
  }

  await db.from('admin_log').insert({ admin_email: me.email, action, target_email: target.email });
  return NextResponse.json({ ok: true });
}
