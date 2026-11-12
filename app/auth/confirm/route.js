import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

const TYPES = new Set(['email', 'magiclink']);

// Alur link-email berbasis token_hash: diverifikasi di server, TANPA cookie PKCE.
// Jadi link boleh dibuka di perangkat/browser lain dari tempat login diminta.
// Tujuan redirect SELALU /dashboard (tidak ada parameter "next" -> tidak ada open redirect).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  if (tokenHash && tokenHash.length < 200 && TYPES.has(type)) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/?error=login`);
}
