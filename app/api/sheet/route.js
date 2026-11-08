import { NextResponse } from 'next/server';
import { apiRateLimit, TOO_MANY } from '@/lib/ratelimit';
import { currentUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { getOrCreateUserRow } from '@/lib/users';
import { callGas } from '@/lib/gas';
import { parseSpreadsheetId } from '@/lib/finance';
import { sameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';

const MESSAGES = {
  no_access: 'AURA belum bisa membuka Sheet ini. Pastikan email bot sudah menjadi Editor.',
  not_editor: 'Email yang Kakak pakai untuk masuk belum menjadi pemilik/Editor Sheet ini.',
};

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await apiRateLimit(user.id, 'sheet', 10, 600000))) return NextResponse.json(TOO_MANY, { status: 429 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }
  const sheetId = parseSpreadsheetId(body?.spreadsheet); // hanya field ini yang dibaca (anti mass-assignment)
  if (!sheetId) {
    return NextResponse.json({ error: 'Link atau ID Google Sheets tidak valid.' }, { status: 400 });
  }

  const row = await getOrCreateUserRow(user);

  // Bukti kepemilikan: bot harus bisa membuka Sheet DAN email login harus pemilik/editor Sheet itu.
  try {
    await callGas({ action: 'setup', spreadsheet_id: sheetId, user_email: user.email });
  } catch (err) {
    const msg = MESSAGES[err.code] || 'Gagal memeriksa Sheet. Coba lagi sebentar.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { error } = await admin().from('users').update({ spreadsheet_id: sheetId }).eq('id', row.id);
  if (error) {
    const msg =
      error.code === '23505' ? 'Sheet ini sudah dipakai akun AURA lain.' : 'Gagal menyimpan. Coba lagi.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
