import { admin } from './supabase/admin';

const COLS = 'id, email, no_whatsapp, spreadsheet_id';

/** Ambil baris users milik akun login; buat bila belum ada. */
export async function getOrCreateUserRow(authUser) {
  const db = admin();
  let { data } = await db.from('users').select(COLS).eq('auth_user_id', authUser.id).maybeSingle();
  if (!data) {
    await db.from('users').insert({ auth_user_id: authUser.id, email: authUser.email });
    ({ data } = await db.from('users').select(COLS).eq('auth_user_id', authUser.id).maybeSingle());
  }
  return data;
}

export const maskPhone = (no) => (no ? `${String(no).slice(0, 4)}••••${String(no).slice(-3)}` : null);
