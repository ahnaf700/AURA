'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

const nf = new Intl.NumberFormat('id-ID');
const dt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const fmt = (s) => (s ? dt.format(new Date(s)) : '—');

const ACTION_LABEL = {
  unlink_chat: 'Putuskan chat',
  unlink_wa: 'Putuskan WhatsApp', // log lama
  telegram_webhook: 'Pasang webhook Telegram',
  reset_sheet: 'Lepas Sheet',
  delete: 'Hapus akun',
};
const CONFIRM = {
  unlink_chat: 'Putuskan semua chat (WhatsApp dan Telegram) dari akun ini? Pengguna harus menautkan ulang dengan kode baru.',
  reset_sheet: 'Lepas Google Sheets dari akun ini? Isi Sheet milik pengguna tidak diubah.',
  delete: 'HAPUS akun ini permanen? Pengguna harus mendaftar ulang. Tindakan ini tidak bisa dibatalkan.',
};

function status(u) {
  if (u.hasSheet && u.linked) return ['Aktif', 'in'];
  if (u.hasSheet) return ['Belum tautkan chat', 'warn'];
  return ['Belum setup', 'muted'];
}

export default function AdminPanel() {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState('');
  const [tg, setTg] = useState(null);
  const [tgMsg, setTgMsg] = useState('');

  const loadTg = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/telegram', { cache: 'no-store' });
      if (res.ok) setTg(await res.json());
    } catch {
      /* status Telegram bersifat tambahan */
    }
  }, []);

  async function setupTg() {
    setBusy('tg');
    setTgMsg('');
    try {
      const res = await fetch('/api/admin/telegram', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal memasang webhook.');
      setTgMsg('Webhook terpasang.');
      await loadTg();
      await load();
    } catch (e) {
      setTgMsg(e.message);
    } finally {
      setBusy('');
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Gagal memuat data admin.');
      setData(json);
      setState('ready');
    } catch (e) {
      setErr(e.message || 'Koneksi bermasalah.');
      setState('error');
    }
  }, []);

  useEffect(() => { load(); loadTg(); }, [load, loadTg]);

  async function act(u, action) {
    if (!window.confirm(`${u.email}\n\n${CONFIRM[action]}`)) return;
    setBusy(u.id + action);
    setErr('');
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Aksi gagal.');
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  }

  const users = useMemo(() => {
    if (!data) return [];
    const term = q.trim().toLowerCase();
    return data.users.filter((u) => {
      const st = status(u)[1];
      return (!term || u.email.toLowerCase().includes(term)) && (!filter || st === filter);
    });
  }, [data, q, filter]);

  if (state === 'loading') return <p className="muted" role="status">Memuat data admin…</p>;
  if (state === 'error' && !data) return <p className="err" role="alert">{err}</p>;

  const s = data.stats;
  const cards = [
    ['Total pengguna', s.total, `+${s.new7d} dalam 7 hari`],
    ['Aktif penuh', s.complete, 'Sheet + WhatsApp tertaut'],
    ['Belum selesai setup', s.sheetOnly + s.noSheet, `${s.sheetOnly} tinggal tautkan chat`],
    ['Pesan 24 jam', s.messages24h, `${s.activeNumbers24h} nomor aktif`],
    ['Panggilan dashboard 24 jam', s.apiHits24h, 'data, sheet, kode'],
  ];
  const missing = data.config.filter((c) => !c.set);

  return (
    <main>
      {err && <p className="err" role="alert" style={{ marginBottom: 12 }}>{err}</p>}

      <section className="admin-stats" aria-label="Ringkasan">
        {cards.map(([label, val, sub]) => (
          <div className="stat" key={label}>
            <div className="label">{label}</div>
            <div className="val">{nf.format(val)}</div>
            <div className="muted sub">{sub}</div>
          </div>
        ))}
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <h2>Saluran chat</h2>
        <ul className="legend">
          <li>
            <span>Telegram{tg?.username ? ' (@' + tg.username + ')' : ''}</span>
            <span className={`tag ${tg?.valid && tg?.webhookUrl ? 'in' : 'warn'}`} style={{ marginLeft: 'auto' }}>
              {!tg ? 'Memuat…' : !tg.configured ? 'Belum diatur' : !tg.valid ? 'Token ditolak' : tg.webhookUrl ? 'Aktif' : 'Webhook belum dipasang'}
            </span>
          </li>
          <li>
            <span>WhatsApp</span>
            <span className="tag muted" style={{ marginLeft: 'auto' }}>Dinonaktifkan sementara</span>
          </li>
        </ul>
        {tg?.valid && (
          <>
            {tg.webhookUrl && <p className="muted" style={{ marginTop: 10 }}>Webhook: {tg.webhookUrl} · menunggu: {tg.pending}</p>}
            {tg.lastError && <p className="err" style={{ marginTop: 6 }}>Error terakhir dari Telegram: {tg.lastError}</p>}
            {!tg.secretSet && <p className="err" style={{ marginTop: 6 }}>TELEGRAM_WEBHOOK_SECRET belum valid (min 24 karakter).</p>}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn small" disabled={!!busy || !tg.secretSet} onClick={setupTg}>
                {busy === 'tg' ? 'Memasang…' : tg.webhookUrl ? 'Pasang ulang webhook' : 'Pasang webhook Telegram'}
              </button>
              <button className="btn ghost small" disabled={!!busy} onClick={loadTg}>Periksa status</button>
            </div>
          </>
        )}
        {tg && !tg.configured && <p className="muted" style={{ marginTop: 10 }}>Isi TELEGRAM_BOT_TOKEN di Vercel, lalu redeploy.</p>}
        {tg && tg.configured && !tg.valid && <p className="err" style={{ marginTop: 10 }}>{tg.error}</p>}
        {tgMsg && <p className={tgMsg === 'Webhook terpasang.' ? 'ok' : 'err'} style={{ marginTop: 8 }}>{tgMsg}</p>}
      </section>

      <section className="panel" style={{ marginTop: 14 }}>
        <h2>Pengguna</h2>
        <div className="toolbar">
          <label>Cari email
            <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nama@email.com" />
          </label>
          <label>Status
            <select className="field" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Semua</option>
              <option value="in">Aktif</option>
              <option value="warn">Belum tautkan WA</option>
              <option value="muted">Belum setup</option>
            </select>
          </label>
          <button className="btn ghost small" onClick={load}>Muat ulang</button>
        </div>
        {users.length === 0 ? (
          <p className="empty">Tidak ada pengguna yang cocok.</p>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr><th>Email</th><th>Status</th><th>Chat</th><th>Daftar</th><th>Terakhir masuk</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const [label, cls] = status(u);
                  return (
                    <tr key={u.id}>
                      <td>{u.email}{u.isAdmin && <span className="tag admin-tag" style={{ marginLeft: 8 }}>Admin</span>}</td>
                      <td><span className={`tag ${cls}`}>{label}</span></td>
                      <td>{[u.phone ? 'WA ' + u.phone : null, u.tg ? 'Telegram' : null].filter(Boolean).join(' · ') || '—'}</td>
                      <td>{fmt(u.createdAt)}</td>
                      <td>{fmt(u.lastSignIn)}</td>
                      <td>
                        {u.isAdmin ? <span className="muted">—</span> : (
                          <div className="row">
                            {u.linked && <button className="btn ghost small" disabled={!!busy} onClick={() => act(u, 'unlink_chat')}>{ACTION_LABEL.unlink_chat}</button>}
                            {u.hasSheet && <button className="btn ghost small" disabled={!!busy} onClick={() => act(u, 'reset_sheet')}>{ACTION_LABEL.reset_sheet}</button>}
                            <button className="btn ghost small danger" disabled={!!busy} onClick={() => act(u, 'delete')}>{ACTION_LABEL.delete}</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted" style={{ marginTop: 12 }}>
          Isi transaksi tidak ditampilkan: datanya ada di Google Sheets milik masing-masing pengguna.
        </p>
      </section>

      <div className="panels">
        <section className="panel">
          <h2>Kesehatan konfigurasi</h2>
          {missing.length === 0 ? (
            <p className="ok">Semua variabel penting terisi.</p>
          ) : (
            <p className="err">Belum terisi: {missing.map((m) => m.key).join(', ')}</p>
          )}
          <ul className="legend" style={{ marginTop: 12 }}>
            {data.config.map((c) => (
              <li key={c.key}><span>{c.key}</span><span className={`tag ${c.set ? 'in' : 'out'}`} style={{ marginLeft: 'auto' }}>{c.set ? 'Terisi' : 'Kosong'}</span></li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <h2>Aksi admin terakhir</h2>
          {data.log.length === 0 ? (
            <p className="empty">Belum ada aksi.</p>
          ) : (
            <ul className="legend">
              {data.log.map((l, i) => (
                <li key={i} style={{ display: 'grid', gap: 0 }}>
                  <span><strong>{ACTION_LABEL[l.action] || l.action}</strong> · {l.target_email}</span>
                  <span className="muted">{l.admin_email} · {fmt(l.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
