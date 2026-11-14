export const metadata = {
  title: 'Kebijakan Privasi',
  description: 'Bagaimana AURA memproses data pengguna.',
};

const CONTACT = process.env.NEXT_PUBLIC_BOT_EMAIL || 'email kontak AURA';

export default function PrivacyPage() {
  return (
    <main className="legal">
      <style>{`
        .legal{max-width:760px;margin:0 auto;padding:32px 20px 64px;line-height:1.7}
        .legal h1{font-size:1.8rem;margin-bottom:4px}
        .legal h2{font-size:1.15rem;margin:28px 0 8px}
        .legal p,.legal li{opacity:.92}
        .legal ul{padding-left:20px}
        .legal a{text-decoration:underline}
      `}</style>
      <p><a href="/">&larr; Kembali ke AURA</a></p>
      <h1>Kebijakan Privasi</h1>
      <p>Terakhir diperbarui: 13 November 2026</p>

      <h2>1. Tentang AURA</h2>
      <p>
        AURA adalah asisten pencatat keuangan pribadi. Pengguna mengirim pengeluaran lewat WhatsApp,
        lalu AURA merapikannya ke Google Sheets milik pengguna sendiri dan memberi saran keuangan.
        Halaman ini menjelaskan data apa yang kami proses dan untuk apa.
      </p>

      <h2>2. Data yang kami proses</h2>
      <ul>
        <li><strong>Alamat email</strong>, untuk masuk ke akun lewat link atau kode yang dikirim ke email.</li>
        <li><strong>Nomor WhatsApp atau ID chat Telegram</strong>, untuk menautkan akun dan mengenali pengirim pesan.</li>
        <li><strong>Isi pesan</strong> yang kamu kirim ke AURA lewat WhatsApp atau Telegram, untuk dibaca dan dicatat sebagai transaksi.</li>
        <li><strong>ID Google Sheets</strong> milikmu, supaya AURA tahu ke mana transaksi dicatat.</li>
        <li><strong>Catatan teknis</strong> seperti waktu akses dan kesalahan sistem, untuk menjaga layanan tetap berjalan dan aman.</li>
      </ul>
      <p>
        Isi catatan keuanganmu (daftar transaksi) tersimpan di Google Sheets milikmu, bukan di
        database kami. Kamu yang mengatur siapa boleh melihat atau mengeditnya.
      </p>

      <h2>3. Untuk apa data dipakai</h2>
      <ul>
        <li>Menyediakan layanan: masuk ke akun, mencatat transaksi, dan menampilkan ringkasan di dashboard.</li>
        <li>Memberi saran keuangan berdasarkan catatanmu.</li>
        <li>Mencegah penyalahgunaan dan menjaga keamanan layanan.</li>
      </ul>
      <p>Kami tidak menjual data pribadi dan tidak memakainya untuk iklan.</p>

      <h2>4. Pihak ketiga yang membantu kami</h2>
      <p>Untuk menjalankan layanan, data diproses oleh penyedia berikut sesuai kebijakan mereka masing-masing:</p>
      <ul>
        <li><strong>Meta (WhatsApp Business Platform)</strong>, untuk menerima dan mengirim pesan WhatsApp.</li>
        <li><strong>Telegram</strong>, untuk menerima dan mengirim pesan lewat bot Telegram.</li>
        <li><strong>Google</strong> (Google Sheets dan model AI Gemini), untuk menyimpan catatan dan memahami isi pesan.</li>
        <li><strong>Supabase</strong>, untuk database akun dan proses masuk.</li>
        <li><strong>Vercel</strong>, untuk menjalankan situs dan server AURA.</li>
      </ul>

      <h2>5. Berapa lama data disimpan</h2>
      <ul>
        <li>Data akun (email, nomor WhatsApp atau ID Telegram, tautan Sheets) disimpan selama akunmu aktif.</li>
        <li>Penanda pesan yang sudah diproses (untuk mencegah pencatatan ganda) dihapus otomatis setelah sekitar 24 jam.</li>
        <li>Data akun dihapus bila kamu memintanya (lihat bagian 6).</li>
      </ul>

      <h2>6. Hak kamu dan penghapusan data</h2>
      <p>
        Kamu dapat meminta akses, koreksi, atau penghapusan datamu kapan saja. Cara menghapus akun
        dijelaskan di halaman <a href="/data-deletion">Penghapusan Data</a>.
      </p>

      <h2>7. Keamanan</h2>
      <p>
        Koneksi ke AURA memakai HTTPS. Akses ke database dibatasi di sisi server, dan kunci layanan
        disimpan sebagai variabel rahasia. Tidak ada sistem yang sepenuhnya bebas risiko, tetapi
        kami berusaha menjaga datamu seaman mungkin.
      </p>

      <h2>8. Perubahan kebijakan</h2>
      <p>Bila kebijakan ini berubah, tanggal pembaruan di atas ikut diperbarui.</p>

      <h2>9. Kontak</h2>
      <p>Pertanyaan tentang privasi dapat dikirim ke: {CONTACT}</p>
    </main>
  );
}
