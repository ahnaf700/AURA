import { NextResponse } from 'next/server';
import { apiRateLimit, TOO_MANY } from '@/lib/ratelimit';
import { currentUser } from '@/lib/supabase/server';
import { admin } from '@/lib/supabase/admin';
import { getOrCreateUserRow } from '@/lib/users';
import { makeLinkCode, sameOrigin } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await apiRateLimit(user.id, 'link-code', 10, 600000))) return NextResponse.json(TOO_MANY, { status: 429 });

  const row = await getOrCreateUserRow(user);
  if (!row?.spreadsheet_id) {
    return NextResponse.json({ error: 'Hubungkan Google Sheets dulu.' }, { status: 400 });
  }

  const code = makeLinkCode();
  const expires = new Date(Date.now() + 10 * 60_000).toISOString();
  const { error } = await admin()
    .from('users')
    .update({ link_code: code, link_code_expires: expires })
    .eq('id', row.id);
  if (error) return NextResponse.json({ error: 'Gagal membuat kode. Coba lagi.' }, { status: 500 });
  return NextResponse.json({ code, expires });
}
