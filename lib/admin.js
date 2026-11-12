import { currentUser } from './supabase/server';

/** Daftar email admin dari env ADMIN_EMAILS (pisahkan dengan koma). */
export function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const isAdminEmail = (email) => !!email && adminEmails().includes(String(email).toLowerCase());

/** Pengguna login yang emailnya terverifikasi DAN terdaftar sebagai admin; selain itu null. */
export async function currentAdmin() {
  const user = await currentUser();
  if (!user?.email || !user.email_confirmed_at) return null;
  return isAdminEmail(user.email) ? user : null;
}
