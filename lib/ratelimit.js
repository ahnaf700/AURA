import { admin } from './supabase/admin';

/** true = boleh lanjut, false = kena batas. Gagal-buka bila DB error (dicatat), supaya layanan tidak mati total. */
export async function apiRateLimit(userId, route, max, windowMs) {
  try {
    const db = admin();
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await db
      .from('api_hits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('route', route)
      .gte('created_at', since);
    if (error) throw new Error(error.message);
    if ((count ?? 0) >= max) return false;
    await db.from('api_hits').insert({ user_id: userId, route });
    if (Math.random() < 0.02) {
      await db.from('api_hits').delete().lt('created_at', new Date(Date.now() - 864e5).toISOString());
    }
    return true;
  } catch (err) {
    console.error('Rate limit error:', err.message);
    return true;
  }
}

export const TOO_MANY = { error: 'Terlalu banyak permintaan. Coba lagi sebentar.' };
