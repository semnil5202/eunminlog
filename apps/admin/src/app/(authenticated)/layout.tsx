'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { getSupabase } from '@/shared/lib/supabase';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/');
        return;
      }
      setIsAuthenticated(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace('/');
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    await getSupabase().auth.signOut();
    router.replace('/');
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold">
            eunminlog
          </Link>
          <Link href="/posts/new" className="text-sm text-gray-600 hover:text-gray-900">
            새 글 작성
          </Link>
        </nav>
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          로그아웃
        </button>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
