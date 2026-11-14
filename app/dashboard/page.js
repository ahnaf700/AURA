import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';
import { getOrCreateUserRow } from '@/lib/users';
import { isAdminEmail } from '@/lib/admin';
import Onboarding from './Onboarding';
import Dashboard from './Dashboard';
import { LogoMark } from '@/components/Logo';

export default async function DashboardPage({ searchParams }) {
  const user = await currentUser();
  if (!user) redirect('/');
  const sp = await searchParams;
  const row = await getOrCreateUserRow(user);

  const linkedAny = !!(row?.no_whatsapp || row?.telegram_chat_id);
  const complete = !!row?.spreadsheet_id && linkedAny;
  const showSetup = !complete || sp?.setup === '1';

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="/dashboard"><LogoMark size={40} /><span>AURA</span></a>
        <div className="who">
          <span className="muted">{user.email}</span>
          {user.email_confirmed_at && isAdminEmail(user.email) && <a className="btn ghost small" href="/admin">Admin</a>}
          {complete && (
            <a className="btn ghost small" href={showSetup ? '/dashboard' : '/dashboard?setup=1'}>
              {showSetup ? 'Kembali ke dashboard' : 'Pengaturan'}
            </a>
          )}
          <form action="/auth/signout" method="post">
            <button className="btn ghost small">Keluar</button>
          </form>
        </div>
      </header>

      {showSetup ? (
        <Onboarding
          initial={{ hasSheet: !!row?.spreadsheet_id, linked: linkedAny }}
          botEmail={process.env.NEXT_PUBLIC_BOT_EMAIL || ''}
          channels={{
            telegram: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '',
            // WhatsApp baru tampil bila NEXT_PUBLIC_WHATSAPP_ENABLED=true (setelah jalurnya siap).
            whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_ENABLED === 'true' ? process.env.NEXT_PUBLIC_BOT_WA_NUMBER || '' : '',
          }}
          templateUrl={process.env.NEXT_PUBLIC_TEMPLATE_URL || ''}
        />
      ) : (
        <Dashboard />
      )}
    </div>
  );
}
