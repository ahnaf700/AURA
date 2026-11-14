import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/supabase/server';
import { getOrCreateUserRow, maskPhone } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const row = await getOrCreateUserRow(user);
  return NextResponse.json({
    hasSheet: !!row?.spreadsheet_id,
    linked: !!(row?.no_whatsapp || row?.telegram_chat_id),
    whatsapp: !!row?.no_whatsapp,
    telegram: !!row?.telegram_chat_id,
    phone: maskPhone(row?.no_whatsapp),
  });
}
