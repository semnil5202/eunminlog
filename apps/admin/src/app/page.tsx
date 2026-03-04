'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getSupabase, isSupabaseConfigured } from '@/shared/lib/supabase';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center text-2xl font-bold">eunminlog admin</h1>
        {!isSupabaseConfigured && (
          <p className="text-center text-sm text-red-500">
            .env.local에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.
          </p>
        )}
        <p className="mt-4 text-center text-gray-500">로그인 폼은 auth feature에서 구현 예정</p>
      </div>
    </main>
  );
}
