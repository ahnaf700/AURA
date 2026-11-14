'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export default function Onboarding({ initial, botEmail, channels, templateUrl }) {
  const router = useRouter();
  const [hasSheet, setHasSheet] = useState(initial.hasSheet);
  const [linked, setLinked] = useState(initial.linked);
  const [sheetInput, setSheetInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);

  // Setelah kode dibuat, cek berkala apakah nomor sudah tertaut.
  useEffect(() => {
    if (!code || linked) return;
    const t = setInterval(async () => {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!res.ok) return;
      const me = await res.json();
      if (me.linked) {
        setLinked(true);
        clearInterval(t);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [code, linked]);

  async function saveSheet(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { ok, data } = await postJson('/api/sheet', { spreadsheet: sheetInput });
    setBusy(false);
    if (ok) setHasSheet(true);
    else setError(data.error || 'Gagal menyimpan Sheet.');
  }

  async function makeCode() {
    setBusy(true);
    setError('');
    const { ok, data } = await postJson('/api/link-code');
    setBusy(false);
    if (ok) setCode(data.code);
    else setError(data.error || 'Gagal membuat kode.');
  }

  async function copyBotEmail() {
    try {
      await navigator.clipboard.writeText(botEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  const waLink = code && channels.whatsapp ? `https://wa.me/${encodeURIComponent(channels.whatsapp)}?text=${encodeURIComponent(code)}` : null;
  const tgLink = code && channels.telegram ? `https://t.me/${encodeURIComponent(channels.telegram)}?start=${encodeURIComponent(code)}` : null;
  const noChannel = !channels.telegram && !channels.whatsapp;

  return (
    <main>
      <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Siapkan AURA</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Tiga langkah, hanya sekali. Setelah itu cukup kirim chat.
      </p>

      <div className="steps">
        <section className={`step ${hasSheet ? 'done' : ''}`}>
          <h2><span className="num">1</span> Salin template Google Sheets</h2>
          <p className="muted">Template ini berisi sheet &quot;Transaksi&quot; yang dipakai AURA. File-nya milikmu sendiri.</p>
          <div className="row">
            {templateUrl ? (
              <a className="btn" href={templateUrl} target="_blank" rel="noopener noreferrer">Salin template</a>
            ) : (
              <span className="err">Link template belum diatur oleh admin.</span>
            )}
          </div>
        </section>

        <section className={`step ${hasSheet ? 'done' : ''}`}>
          <h2><span className="num">2</span> Bagikan ke bot dan tempel link Sheet-mu</h2>
          <p>
            Klik <b>Bagikan</b> di Sheet-mu, tambahkan <code className="inline">{botEmail || 'email bot'}</code> sebagai <b>Editor</b>.
          </p>
          {botEmail && (
            <div className="row">
              <button type="button" className="btn ghost small" onClick={copyBotEmail}>
                {copied ? 'Tersalin' : 'Salin email bot'}
              </button>
            </div>
          )}
          <form className="row" onSubmit={saveSheet}>
            <input
              className="field"
              style={{ flex: 1, minWidth: 220 }}
              placeholder="https://docs.google.com/spreadsheets/d/…"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              required
              aria-label="Link Google Sheets"
            />
            <button className="btn" disabled={busy}>{busy && !hasSheet ? 'Memeriksa…' : hasSheet ? 'Ganti Sheet' : 'Simpan Sheet'}</button>
          </form>
          {hasSheet && <p className="ok">Sheet terhubung.</p>}
          <p className="muted" style={{ fontSize: '.9rem' }}>
            Gunakan email yang sama dengan akun Google pemilik Sheet. Itu cara AURA memastikan Sheet-nya milikmu.
          </p>
        </section>

        <section className={`step ${linked ? 'done' : hasSheet ? '' : 'locked'}`}>
          <h2><span className="num">3</span> Hubungkan chat</h2>
          {linked ? (
            <p className="ok">Chat terhubung. Selesai! Buka dashboard untuk melihat catatanmu.</p>
          ) : (
            <>
              <p className="muted">
                Buat kode, lalu kirim kode itu ke bot AURA dari chat yang ingin kamu pakai. Kode berlaku 10 menit.
              </p>
              {noChannel && <p className="err">Belum ada saluran chat yang aktif. Hubungi admin.</p>}
              {!code ? (
                <div className="row">
                  <button className="btn" onClick={makeCode} disabled={!hasSheet || busy || noChannel}>Buat kode</button>
                </div>
              ) : (
                <>
                  <div className="code" aria-live="polite">{code}</div>
                  <div className="row">
                    {tgLink && <a className="btn" href={tgLink} target="_blank" rel="noopener noreferrer">Buka Telegram</a>}
                    {waLink && <a className="btn" href={waLink} target="_blank" rel="noopener noreferrer">Kirim lewat WhatsApp</a>}
                    <button className="btn ghost" onClick={makeCode} disabled={busy}>Buat kode baru</button>
                  </div>
                  <p className="muted">Menunggu pesanmu masuk…</p>
                </>
              )}
            </>
          )}
        </section>

        {error && <p className="err" role="alert">{error}</p>}
        {hasSheet && linked && (
          <div className="row">
            <button className="btn" onClick={() => router.push('/dashboard')}>Buka dashboard</button>
          </div>
        )}
      </div>
    </main>
  );
}
