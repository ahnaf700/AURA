'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

const SITE = process.env.NEXT_PUBLIC_SITE_URL;

export default function LoginForm({ failed }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState(failed ? 'failed' : 'idle'); // idle | sending | sent | verifying | error | failed
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setState('sending');
    const origin = (SITE || window.location.origin).replace(/\/$/, '');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setMsg('Gagal mengirim email masuk. Periksa alamatnya, lalu coba lagi.');
      setState('error');
    } else {
      setState('sent');
    }
  }

  async function onVerify(e) {
    e.preventDefault();
    setState('verifying');
    const sb = supabaseBrowser();
    const args = { email: email.trim(), token: code.replace(/\s/g, '') };
    // Pengguna baru memakai email "Confirm sign up" (type signup); pengguna lama type email.
    let { error } = await sb.auth.verifyOtp({ ...args, type: 'email' });
    if (error) ({ error } = await sb.auth.verifyOtp({ ...args, type: 'signup' }));
    if (error) {
      setMsg('Kode salah atau sudah kedaluwarsa. Periksa lagi atau minta kode baru.');
      setState('sent-error');
    } else {
      window.location.assign('/dashboard');
    }
  }

  if (state === 'sent' || state === 'verifying' || state === 'sent-error') {
    return (
      <form className="login" onSubmit={onVerify}>
        <p className="ok" role="status">Email masuk sudah dikirim ke {email}.</p>
        <p className="muted">
          Klik link di emailnya, atau masukkan kode angka dari email yang sama di bawah ini
          (berguna bila emailnya kamu buka di HP atau browser lain).
        </p>
        <label htmlFor="code" className="muted">Kode dari email</label>
        <input
          id="code"
          className="field"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,10}"
          maxLength={10}
          placeholder="123456"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="btn" disabled={state === 'verifying' || code.replace(/\s/g, '').length < 6}>
          {state === 'verifying' ? 'Memeriksa…' : 'Masuk dengan kode'}
        </button>
        {state === 'sent-error' && <p className="err" role="alert">{msg}</p>}
        <button type="button" className="btn ghost small" onClick={() => { setCode(''); setState('idle'); }}>
          Pakai email lain / kirim ulang
        </button>
      </form>
    );
  }

  return (
    <form className="login" onSubmit={onSubmit}>
      <label htmlFor="email" className="muted">Masuk atau daftar dengan emailmu</label>
      <input
        id="email"
        className="field"
        type="email"
        required
        autoComplete="email"
        placeholder="nama@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button className="btn" disabled={state === 'sending'}>
        {state === 'sending' ? 'Mengirim…' : 'Kirim link masuk'}
      </button>
      {state === 'failed' && <p className="err" role="alert">Link masuk tidak valid atau sudah kedaluwarsa. Minta link baru, atau pakai kode dari email.</p>}
      {state === 'error' && <p className="err" role="alert">{msg}</p>}
    </form>
  );
}
