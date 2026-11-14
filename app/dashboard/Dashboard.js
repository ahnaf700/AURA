'use client';
import { useEffect, useMemo, useState } from 'react';

const COLORS = ['#66e3cf', '#5cb8f4', '#7c8ff4', '#f4ae4f', '#ff9a76', '#c58bf2', '#8fd36b', '#f28bb5', '#b8c4d8', '#4fb3a5', '#e8d26b'];
const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Dashboard() {
  const [month, setMonth] = useState(thisMonth());
  const [rows, setRows] = useState([]);
  const [truncated, setTruncated] = useState(false);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [errMsg, setErrMsg] = useState('');

  const [fKategori, setFKategori] = useState('');
  const [fTipe, setFTipe] = useState('');
  const [fQuery, setFQuery] = useState('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    fetch(`/api/data?month=${encodeURIComponent(month)}`, { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setErrMsg(data.error || 'Gagal memuat data.');
          setState('error');
          return;
        }
        setRows(data.rows || []);
        setTruncated(!!data.truncated);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) {
          setErrMsg('Koneksi bermasalah. Coba muat ulang.');
          setState('error');
        }
      });
    return () => { cancelled = true; };
  }, [month]);

  const totals = useMemo(() => {
    let masuk = 0, keluar = 0;
    const perKat = {};
    for (const r of rows) {
      if (r.tipe === 'Pemasukan') masuk += r.nominal;
      else {
        keluar += r.nominal;
        perKat[r.kategori] = (perKat[r.kategori] || 0) + r.nominal;
      }
    }
    const cats = Object.entries(perKat).sort((a, b) => b[1] - a[1]);
    return { masuk, keluar, saldo: masuk - keluar, cats };
  }, [rows]);

  const kategoriOptions = useMemo(() => [...new Set(rows.map((r) => r.kategori))].sort(), [rows]);

  const filtered = useMemo(() => {
    const q = fQuery.trim().toLowerCase();
    return rows.filter((r) => {
      const day = r.tanggal.slice(0, 10);
      return (
        (!fKategori || r.kategori === fKategori) &&
        (!fTipe || r.tipe === fTipe) &&
        (!fFrom || day >= fFrom) &&
        (!fTo || day <= fTo) &&
        (!q || r.keterangan.toLowerCase().includes(q))
      );
    });
  }, [rows, fKategori, fTipe, fQuery, fFrom, fTo]);

  // Donut: conic-gradient dari persentase tiap kategori
  const donut = useMemo(() => {
    if (totals.keluar <= 0) return null;
    let acc = 0;
    const stops = totals.cats.map(([, v], i) => {
      const start = (acc / totals.keluar) * 100;
      acc += v;
      const end = (acc / totals.keluar) * 100;
      return `${COLORS[i % COLORS.length]} ${start}% ${end}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [totals]);

  return (
    <main>
      <div className="toolbar">
        <label>
          Bulan
          <input className="field" type="month" value={month} max={thisMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </label>
      </div>

      {state === 'loading' && <p className="muted" role="status">Memuat data dari Google Sheets…</p>}
      {state === 'error' && <p className="err" role="alert">{errMsg}</p>}

      {state === 'ready' && (
        <>
          <section className="balance" aria-label="Sisa saldo">
            <span className="label">Sisa saldo bulan ini</span>
            <span className="amount">{idr.format(totals.saldo)}</span>
          </section>

          <div className="pair">
            <div className="stat in"><div className="label">Pemasukan</div><div className="val">{idr.format(totals.masuk)}</div></div>
            <div className="stat out"><div className="label">Pengeluaran</div><div className="val">{idr.format(totals.keluar)}</div></div>
          </div>

          <div className="panels">
            <section className="panel">
              <h2>Pengeluaran per kategori</h2>
              {donut ? (
                <div className="donut-wrap">
                  <div className="donut" style={{ background: donut }} role="img" aria-label="Diagram pengeluaran per kategori" />
                  <ul className="legend">
                    {totals.cats.map(([k, v], i) => (
                      <li key={k}>
                        <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                        <span>{k}</span>
                        <span className="pct">{Math.round((v / totals.keluar) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="empty">Belum ada pengeluaran di bulan ini.</p>
              )}
            </section>

            <section className="panel">
              <h2>Rincian kategori</h2>
              {totals.cats.length ? (
                <ul className="legend">
                  {totals.cats.map(([k, v]) => (
                    <li key={k}><span>{k}</span><span className="pct">{idr.format(v)}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="empty">Kirim pengeluaran lewat chat, misalnya &quot;makan siang 25rb&quot;.</p>
              )}
            </section>
          </div>

          <section className="panel" style={{ marginTop: 14 }}>
            <h2>Riwayat transaksi</h2>
            <div className="toolbar">
              <label>Dari tanggal<input className="field" type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} /></label>
              <label>Sampai<input className="field" type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} /></label>
              <label>Kategori
                <select className="field" value={fKategori} onChange={(e) => setFKategori(e.target.value)}>
                  <option value="">Semua</option>
                  {kategoriOptions.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
              <label>Tipe
                <select className="field" value={fTipe} onChange={(e) => setFTipe(e.target.value)}>
                  <option value="">Semua</option>
                  <option value="Pemasukan">Pemasukan</option>
                  <option value="Pengeluaran">Pengeluaran</option>
                </select>
              </label>
              <label>Cari keterangan
                <input className="field" value={fQuery} onChange={(e) => setFQuery(e.target.value)} placeholder="kopi, bensin…" />
              </label>
            </div>

            {truncated && <p className="muted">Menampilkan 1.000 transaksi terbaru bulan ini.</p>}
            {filtered.length === 0 ? (
              <p className="empty">Tidak ada transaksi yang cocok.</p>
            ) : (
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Keterangan</th><th className="num-r">Nominal</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={`${r.tanggal}-${i}`}>
                        <td>{r.tanggal}</td>
                        <td><span className={`tag ${r.tipe === 'Pemasukan' ? 'in' : 'out'}`}>{r.tipe}</span></td>
                        <td>{r.kategori}</td>
                        <td>{r.keterangan}</td>
                        <td className="num-r">{idr.format(r.nominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
