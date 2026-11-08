'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/browser';

export default function LoginForm({ failed }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState(failed ? 'failed' : 'idle'); // idle | sending | sent | error | failed
  const [msg, setMsg] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setState('sending');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMsg('Gagal mengirim link masuk. Periksa emailnya, lalu coba lagi.');
      setState('error');
    } else {
      setState('sent');
    }
  }

  if (state === 'sent') {
    return (
      <p className="login ok" role="status">
        Link masuk sudah dikirim ke {email}. Buka emailnya, lalu klik link tersebut.
      </p>
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
      {state === 'failed' && <p className="err" role="alert">Link masuk tidak valid atau sudah kedaluwarsa. Minta link baru.</p>}
      {state === 'error' && <p className="err" role="alert">{msg}</p>}
    </form>
  );
}
