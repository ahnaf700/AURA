import { NextResponse } from 'next/server';
import { currentAdmin, isAdminEmail } from '@/lib/admin';
import { admin } from '@/lib/supabase/admin';
import { maskPhone } from '@/lib/users';

export const dynamic = 'force-dynamic';

const CONFIG_KEYS = ['GEMINI_API_KEY', 'SUPABASE_SERVICE_KEY', 'GAS_WEB_APP_URL', 'GAS_SHARED_SECRET', 'META_ACCESS_TOKEN', 'META_PHONE_NUMBER_ID', 'META_APP_SECRET', 'META_VERIFY_TOKEN', 'NEXT_PUBLIC_SITE_URL'];

export async function GET() {
  const me = await currentAdmin();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const db = admin();
  const day = new Date(Date.now() - 864e5).toISOString();
  const [users, msgs, hits, logs, authList] = await Promise.all([
    db.from('users').select('id, auth_user_id, email, no_whatsapp, spreadsheet_id, created_at').order('created_at', { ascending: false }).limit(500),
    db.from('processed_messages').select('wa_number').gte('created_at', day).limit(5000),
    db.from('api_hits').select('id', { count: 'exact', head: true }).gte('created_at', day),
    db.from('admin_log').select('admin_email, action, target_email, created_at').order('created_at', { ascending: false }).limit(15),
    db.auth.admin.listUsers({ page: 1, perPage: 500 }),
  ]);
  if (users.error) {
    console.error('Admin overview error:', users.error.message);
    return NextResponse.json({ error: 'Gagal membaca database.' }, { status: 500 });
  }

  const lastSeen = new Map((authList.data?.users || []).map((u) => [u.id, u.last_sign_in_at]));
  const rows = users.data.map((u) => ({
    id: u.id,
    email: u.email,
    phone: maskPhone(u.no_whatsapp),
    hasSheet: !!u.spreadsheet_id,
    linked: !!u.no_whatsapp,
    isAdmin: isAdminEmail(u.email),
    createdAt: u.created_at,
    lastSignIn: lastSeen.get(u.auth_user_id) || null,
  }));

  const week = Date.now() - 7 * 864e5;
  const stats = {
    total: rows.length,
    complete: rows.filter((r) => r.hasSheet && r.linked).length,
    sheetOnly: rows.filter((r) => r.hasSheet && !r.linked).length,
    noSheet: rows.filter((r) => !r.hasSheet).length,
    new7d: rows.filter((r) => new Date(r.createdAt).getTime() >= week).length,
    messages24h: msgs.data?.length ?? 0,
    activeNumbers24h: new Set((msgs.data || []).map((m) => m.wa_number)).size,
    apiHits24h: hits.count ?? 0,
  };

  return NextResponse.json({
    stats,
    users: rows,
    log: logs.data || [],
    config: CONFIG_KEYS.map((k) => ({ key: k, set: !!process.env[k] })),
  });
}
