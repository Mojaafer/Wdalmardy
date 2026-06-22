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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <Topbar user={user} onMenu={() => setDrawerOpen((v) => !v)} />
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>

      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-30 lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="fixed top-0 right-0 z-40 lg:hidden">
            <Sidebar user={user} className="flex h-screen" />
          </aside>
        </>
      )}
    </div>
  );
}
