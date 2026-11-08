import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';
import { LogoLockup, LogoMark } from '@/components/Logo';
import LoginForm from './LoginForm';

export default async function Home({ searchParams }) {
  const user = await currentUser();
  if (user) redirect('/dashboard');
  const sp = await searchParams;

  // Jaring pengaman: bila Supabase mengirim ?code= ke halaman depan, teruskan ke penukar sesi kita sendiri.
  if (typeof sp?.code === 'string' && sp.code.length < 200) {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}`);
  }

  return (
    <main className="landing">
      <section className="hero">
        <LogoLockup size={112} priority />
        <h1>Catat uang semudah kirim chat.</h1>
        <p className="lead">
          Ketik pengeluaranmu di WhatsApp. AURA merapikannya ke Google Sheets milikmu sendiri, lalu memberi saran
          keuangan yang sesuai kebiasaanmu.
        </p>
        <LoginForm failed={sp?.error === 'login'} />
        <p className="landing-note">
          Datamu tersimpan di Google Sheets milikmu. Kamu yang mengatur siapa boleh melihat atau mengedit.
        </p>
      </section>

      <section className="chat glow-border" aria-label="Contoh percakapan">
        <div className="chat-head"><LogoMark size={26} /><span>AURA</span></div>
        <div className="bubble me">Beli bensin 25rb dan bayar parkir 2000</div>
        <div className="bubble bot">
          {'✅ Tercatat:\n• Pengeluaran – Bensin: Rp25.000\n• Pengeluaran – Parkir: Rp2.000\n\nTransportasi bulan ini sudah Rp310.000, Kak. Masih wajar dibanding bulan lalu 👍'}
        </div>
        <div className="bubble me">Gimana caranya biar bisa nabung?</div>
        <div className="bubble bot">
          {'Gaji masuk Rp5.000.000 dan sisa saldo Rp1.900.000, Kak. Coba sisihkan 10% di awal bulan ke tabungan terpisah, sebelum dipakai belanja. Mulai bulan ini ya? 💪'}
        </div>
      </section>
    </main>
  );
}
