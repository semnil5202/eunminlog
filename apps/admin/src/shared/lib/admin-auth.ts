import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export type AdminAccess = { status: 200; user: User } | { status: 401 | 403 };

export async function getAdminAccess(): Promise<AdminAccess> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { status: 401 };
  if (user.app_metadata?.role !== 'admin') return { status: 403 };
  return { status: 200, user };
}

export async function requireAdmin(): Promise<User> {
  const access = await getAdminAccess();
  if (access.status !== 200) {
    throw new Error(access.status === 401 ? '인증이 필요합니다.' : '관리자 권한이 필요합니다.');
  }
  return access.user;
}
