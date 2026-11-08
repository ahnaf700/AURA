import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Tujuan redirect SELALU /dashboard (tidak menerima parameter "next" -> tidak ada open redirect).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/?error=login`);
}
