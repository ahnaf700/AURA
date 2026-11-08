import { NextResponse } from 'next/server';
import { apiRateLimit, TOO_MANY } from '@/lib/ratelimit';
import { currentUser } from '@/lib/supabase/server';
import { getOrCreateUserRow } from '@/lib/users';
import { callGas } from '@/lib/gas';
import { isMonth } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await apiRateLimit(user.id, 'data', 30, 60000))) return NextResponse.json(TOO_MANY, { status: 429 });

  const month = new URL(req.url).searchParams.get('month');
  if (!isMonth(month)) return NextResponse.json({ error: 'Bulan tidak valid.' }, { status: 400 });

  // spreadsheet_id SELALU diambil dari akun yang login, tidak pernah dari klien (anti-IDOR).
  const row = await getOrCreateUserRow(user);
  if (!row?.spreadsheet_id) return NextResponse.json({ error: 'Sheet belum terhubung.' }, { status: 400 });

  try {
    const data = await callGas({ action: 'list', spreadsheet_id: row.spreadsheet_id, month });
    return NextResponse.json({ rows: data.rows || [], truncated: !!data.truncated });
  } catch (err) {
    console.error('Gagal ambil data sheet:', err.message);
    return NextResponse.json({ error: 'Gagal membaca Google Sheets.' }, { status: 502 });
  }
}
