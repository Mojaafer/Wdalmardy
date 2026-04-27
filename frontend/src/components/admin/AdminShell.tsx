'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getStoredUser, me, type AdminUser } from '@/lib/admin/api';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = getToken();
      if (!token) {
        router.replace('/admin/login');
        return;
      }
      const cached = getStoredUser();
      if (cached) setUser(cached);
      try {
        const fresh = await me();
        setUser(fresh.data);
      } catch {
        // 401 already handled in api client
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center text-slate-400">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
