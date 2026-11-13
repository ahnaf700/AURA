import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Jenis token yang boleh datang dari link email. Tujuan redirect SELALU /dashboard
// (tidak ada parameter "next" -> tidak ada open redirect).
const TYPES = new Set(['email', 'magiclink', 'signup']);

// Alur link-email berbasis token_hash: diverifikasi di server, TANPA cookie PKCE,
// jadi link boleh dibuka di perangkat/browser lain dari tempat login diminta.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (tokenHash && tokenHash.length < 200 && TYPES.has(type)) {
    const sb = await supabaseServer();
    // Pengguna baru bisa membawa token "signup"; coba jenis yang cocok lalu cadangannya.
    const attempts = type === 'signup' ? ['signup', 'email'] : ['email'];
    for (const t of attempts) {
      const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: t });
      if (!error) return NextResponse.redirect(`${origin}/dashboard`);
    }
  }
  return NextResponse.redirect(`${origin}/?error=login`);
}
