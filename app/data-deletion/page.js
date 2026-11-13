export const metadata = {
  title: 'Penghapusan Data',
  description: 'Cara menghapus akun dan data AURA.',
};

const CONTACT = process.env.NEXT_PUBLIC_BOT_EMAIL || 'email kontak AURA';

export default function DataDeletionPage() {
  return (
    <main className="legal">
      <style>{`
        .legal{max-width:760px;margin:0 auto;padding:32px 20px 64px;line-height:1.7}
        .legal h1{font-size:1.8rem;margin-bottom:4px}
        .legal h2{font-size:1.15rem;margin:28px 0 8px}
        .legal p,.legal li{opacity:.92}
        .legal ul,.legal ol{padding-left:20px}
        .legal a{text-decoration:underline}
      `}</style>
      <p><a href="/">&larr; Kembali ke AURA</a></p>
      <h1>Penghapusan Data</h1>
      <p>Terakhir diperbarui: 13 November 2026</p>

      <h2>Cara menghapus akun dan data AURA</h2>
      <ol>
        <li>
          Kirim email ke <strong>{CONTACT}</strong> dari alamat email yang kamu pakai untuk masuk ke AURA,
          dengan subjek <strong>Hapus data AURA</strong>.
        </li>
        <li>
          Kami memverifikasi bahwa permintaan datang dari pemilik akun, lalu menghapus akunmu dalam
          waktu paling lama 30 hari.
        </li>
        <li>Kami mengonfirmasi lewat email setelah penghapusan selesai.</li>
      </ol>

      <h2>Data apa yang dihapus</h2>
      <ul>
        <li>Alamat email dan akun masukmu.</li>
        <li>Nomor WhatsApp yang tertaut.</li>
        <li>Tautan (ID) Google Sheets yang tersimpan di akunmu.</li>
      </ul>

      <h2>Yang perlu kamu lakukan sendiri</h2>
      <ul>
        <li>
          <strong>Google Sheets milikmu</strong> tidak kami hapus, karena file itu milikmu. Untuk
          menghentikan akses AURA, buka Sheet-mu, klik Bagikan, lalu hapus email bot AURA dari daftar editor.
        </li>
        <li>
          Riwayat percakapan WhatsApp ada di perangkatmu dan di sistem Meta. Hapus lewat aplikasi WhatsApp
          atau sesuai kebijakan Meta.
        </li>
      </ul>

      <p>
        Penjelasan lengkap tentang data yang kami proses ada di <a href="/privacy">Kebijakan Privasi</a>.
      </p>
    </main>
  );
}
