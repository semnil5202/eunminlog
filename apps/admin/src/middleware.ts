import { type NextRequest, NextResponse } from 'next/server';

import { createSupabaseMiddlewareClient } from '@/shared/lib/supabase-middleware';

const PUBLIC_PATHS = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
