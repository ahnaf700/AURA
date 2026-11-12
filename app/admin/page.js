import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';
import { LogoMark } from '@/components/Logo';
import AdminPanel from './AdminPanel';

export const metadata = { title: 'Admin' };

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect('/');
  if (!user.email_confirmed_at || !isAdminEmail(user.email)) notFound(); // pura-pura tidak ada bagi non-admin

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/dashboard"><LogoMark size={40} /><span>AURA</span><span className="tag admin-tag">Admin</span></a>
        <div className="who">
          <span className="muted">{user.email}</span>
          <a className="btn ghost small" href="/dashboard">Dashboard saya</a>
          <form action="/auth/signout" method="post">
            <button className="btn ghost small">Keluar</button>
          </form>
        </div>
      </header>
      <AdminPanel />
    </div>
  );
}
