import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { sameOrigin } from '@/lib/security';

export async function POST(request) {
  if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });
  const sb = await supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL('/', request.url), 303);
}
