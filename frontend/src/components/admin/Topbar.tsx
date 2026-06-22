'use client';

import { useRouter } from 'next/navigation';
import { LogOut, ExternalLink, Menu } from 'lucide-react';
import type { AdminUser } from '@/lib/admin/api';
import { logout, clearSession } from '@/lib/admin/api';
import { ROLE_LABELS } from '@/lib/admin/format';
import NotificationBell from './NotificationBell';
import BranchSwitcher from './BranchSwitcher';

export default function Topbar({
  user,
  onMenu,
}: {
  user: AdminUser;
  onMenu?: () => void;
}) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // ignore — clear locally regardless
    }
    clearSession();
    router.replace('/admin/login');
  }

  const role = user.roles[0] ?? '';

  return (
    <header className="bg-white border-b border-slate-200 px-4 lg:px-6 h-16 flex items-center gap-3 sticky top-0 z-20">
      <button
        onClick={onMenu}
        className="lg:hidden p-2 rounded hover:bg-slate-100 text-slate-600"
        aria-label="القائمة"
      >
        <Menu className="w-5 h-5" />
      </button>

      <BranchSwitcher />

      <div className="flex-1" />

      <a
        href="/ar"
        target="_blank"
        rel="noopener"
        className="hidden md:inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0E5C3A]"
      >
        <ExternalLink className="w-4 h-4" />
        فتح المتجر
      </a>

      <NotificationBell />

      <div className="flex items-center gap-3 pr-3 border-r border-slate-200">
        <div className="w-9 h-9 rounded-full bg-[#FBEFE2] text-[#0E5C3A] grid place-items-center font-bold text-sm">
          {user.name.slice(0, 1)}
        </div>
        <div className="hidden md:block">
          <div className="text-sm font-bold text-slate-800 leading-tight">{user.name}</div>
          <div className="text-[11px] text-slate-500">{ROLE_LABELS[role] ?? role}</div>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="p-2 rounded hover:bg-rose-50 text-rose-600"
        aria-label="تسجيل الخروج"
        title="تسجيل الخروج"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}
