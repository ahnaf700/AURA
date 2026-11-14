# AURA – Automated Rupiah Assistant

Catat transaksi lewat WhatsApp → AI (Gemini) merapikan → tersimpan di **Google Sheets milik pengguna** (BYOD)
→ AI juga menjadi penasihat finansial → dashboard web menampilkan saldo, grafik, dan riwayat.

Satu aplikasi Next.js (deploy ke Vercel): webhook WhatsApp + dashboard. Google Apps Script menjadi "tangan"
yang menulis/membaca Sheet pengguna tanpa Google Cloud.

```
WhatsApp ─► /api/webhook ─► Gemini (ekstrak) ─► Apps Script ─► Sheet pengguna
                         └► Gemini (penasihat, pakai ringkasan Sheet) ─► balasan WA
Browser ─► Supabase Auth (magic link) ─► /dashboard ─► /api/data ─► Apps Script ─► Sheet
```

## Setup

1. **Supabase**: buat project, jalankan `supabase/schema.sql` di SQL Editor (project lama dengan tabel `users` versi lama:
   jalankan `supabase/003_fix_schema_and_admin.sql`; tabel lama diganti nama jadi `users_legacy`, tidak dihapus).
   **Login (wajib, ini penyebab link email menuju localhost):**
   - Authentication > URL Configuration: *Site URL* = alamat situs asli (mis. `https://aura.vercel.app`). Tambahkan ke
     *Redirect URLs*: `https://DOMAINMU/**` dan `http://localhost:3000/**`.
   - Authentication > Emails > Templates > *Magic link*: tempel isi `supabase/email-magic-link.html`
     (link berbasis `token_hash` + kode angka cadangan, jadi bisa dibuka di perangkat lain).
   - Isi `NEXT_PUBLIC_SITE_URL` (URL situs) dan `ADMIN_EMAILS` (email admin) di env.
2. **Google Apps Script** (akun Google bot): tempel `gas/Code.gs`, ikuti petunjuk di komentar atas file
   (Script Property `SHARED_SECRET`, timezone `Asia/Jakarta`, deploy sebagai Web App).
3. **Template Sheet**: buat Google Sheet dengan sheet `Transaksi` dan header
   `Tanggal | Tipe | Kategori | Nominal | Keterangan` (opsional: aksi `setup` akan membuatnya otomatis).
   Ambil ID-nya, link template = `https://docs.google.com/spreadsheets/d/ID/copy`.
4. **Meta WhatsApp Cloud API**: Webhook callback `https://DOMAINMU/api/webhook`, verify token = `META_VERIFY_TOKEN`,
   subscribe field `messages`. `META_APP_SECRET` ada di App Settings > Basic.
5. **Env**: salin `.env.example` → `.env.local` dan isi. (File lamamu `_env` → ganti nama & sesuaikan nama variabel:
   `SUPABASE_URL`→`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_KEY`→`SUPABASE_SERVICE_KEY` + tambah anon key.)
6. `npm install` lalu `npm run dev` (lokal) atau deploy ke Vercel dan isi env di dashboard Vercel.
   Untuk uji webhook lokal pakai tunnel (ngrok / cloudflared).

## Telegram (saluran chat)
1. Di Telegram, buka @BotFather, kirim `/newbot`, ikuti langkahnya, simpan **token** dan **username** bot.
2. Di Vercel isi `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (acak 24+ karakter), `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`; redeploy.
3. Login sebagai admin, buka `/admin`, bagian **Saluran chat**, klik **Pasang webhook Telegram**.
4. Pengguna menautkan lewat dashboard: tombol **Buka Telegram** mengirim kode otomatis.

WhatsApp tetap ada di kode. Aktifkan lagi dengan `NEXT_PUBLIC_WHATSAPP_ENABLED=true`; dua saluran bisa dipakai bersamaan.

## Admin
Login dengan email yang ada di `ADMIN_EMAILS`, lalu buka `/admin`: ringkasan pengguna & pesan 24 jam, daftar pengguna
(cari/filter, putuskan WhatsApp, lepas Sheet, hapus akun), kesehatan konfigurasi, dan log aksi admin.
Isi transaksi tidak pernah ditampilkan (data ada di Sheet pengguna). Akun admin tidak bisa diubah dari panel.

## Alur pengguna baru
Login (magic link) → salin template → share ke email bot sebagai Editor → tempel link Sheet
(server memeriksa akses bot **dan** bahwa email login adalah pemilik/editor Sheet) → buat kode `AURA-XXXXXX`
→ kirim kode itu dari WhatsApp (bukti pemilik nomor) → selesai.

## Keamanan yang sudah diterapkan
- Webhook: verifikasi `X-Hub-Signature-256`, verify token waktu-konstan, respons challenge `text/plain`, batas ukuran body,
  dedup message-id + rate limit per nomor (di DB), log tanpa isi pesan.
- Apps Script: wajib `SHARED_SECRET`, validasi semua input, kolom teks dipaksa plain-text (anti formula injection), error generik.
- Kepemilikan: nomor WA ditautkan lewat kode sekali pakai (10 menit); Sheet harus milik/di-edit email login; 1 Sheet & 1 nomor = 1 akun.
- Anti-IDOR: `spreadsheet_id` selalu dari akun yang login, tidak pernah dari klien.
- CSRF: cek `Origin` pada semua endpoint POST + cookie sesi SameSite (default Supabase).
- Output AI divalidasi ulang (enum, nominal, panjang); AI penasihat hanya mengembalikan teks dan tidak punya aksi;
  ringkasan ke AI tanpa kolom teks bebas (anti prompt injection dari isi Sheet).
- RLS aktif tanpa policy; service key hanya di server. Header keamanan + CSP di `next.config.js`.

## Pemeliharaan keamanan
- `npm run gen-secrets` membuat `META_VERIFY_TOKEN` dan `GAS_SHARED_SECRET` acak (jalankan lokal, jangan dibagikan).
- Saat server start, `lib/env.js` memeriksa konfigurasi: variabel hilang, secret terlalu pendek, service key salah, atau secret berawalan `NEXT_PUBLIC_`.
  Di production server menolak start; di development hanya peringatan.
- Endpoint dashboard dibatasi per pengguna (data 30/menit, sheet & kode 10/10 menit) untuk melindungi kuota Apps Script bersama.
- Next.js dikunci `>=15.5.28 <16`. Jalankan `npm run audit:prod` berkala dan perbarui Next.js + Node.js saat ada advisory baru.

## Catatan / batasan
- `getEditors().getEmail()` di Apps Script kadang kosong untuk akun di luar domain. Jika pemeriksaan "email editor" gagal
  untuk pengguna yang sah, set Script Property `OWNER_CHECK=off` (mengurangi keamanan) atau ganti ke skema tantangan-kode di Sheet.
- Pesan proaktif (ringkasan mingguan otomatis) butuh template pesan WhatsApp yang disetujui Meta; belum termasuk.
- Kuota Apps Script & Gemini gratis terbatas; pantau bila pengguna bertambah.
