'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, ShoppingCart, AlertTriangle, Inbox, CheckCheck } from 'lucide-react';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AdminNotificationItem,
} from '@/lib/admin/api';

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  order_new: { label: 'طلب جديد', icon: ShoppingCart, tone: 'bg-emerald-50 text-emerald-700' },
  low_stock: { label: 'نفاد مخزون', icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700' },
  message_new: { label: 'رسالة', icon: Inbox, tone: 'bg-blue-50 text-blue-700' },
};

function formatRelative(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.round(h / 24);
  return `منذ ${d} يوم`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  // poll unread count every 30s
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await getUnreadCount();
        if (!cancelled) setUnread(res.unread);
      } catch {
        // ignore
      }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await listNotifications({ limit: 10 });
      setItems(res.data);
      setUnread(res.meta.unread);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadItems();
  }

  async function markRead(id: number) {
    await markNotificationRead(id);
    loadItems();
  }

  async function readAll() {
    await markAllNotificationsRead();
    loadItems();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="p-2 rounded hover:bg-slate-100 text-slate-600 relative"
        aria-label="الإشعارات"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#F26B2B] text-white text-[10px] font-bold grid place-items-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-[360px] bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden" dir="rtl">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-800">الإشعارات</span>
            <button
              onClick={readAll}
              disabled={unread === 0}
              className="text-xs text-[#0E5C3A] hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed px-2 py-1 rounded flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              تعليم الكل
            </button>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="text-center py-10 text-slate-400 text-sm">جاري التحميل...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">لا توجد إشعارات</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((n) => {
                  const meta = TYPE_META[n.type] ?? {
                    label: n.type,
                    icon: Bell,
                    tone: 'bg-slate-100 text-slate-600',
                  };
                  const Icon = meta.icon;
                  const isUnread = !n.read_at;
                  return (
                    <li
                      key={n.id}
                      className={[
                        'flex items-start gap-2 px-4 py-3 hover:bg-slate-50',
                        isUnread ? 'bg-emerald-50/30' : '',
                      ].join(' ')}
                    >
                      <span className={['p-1.5 rounded-md flex-shrink-0', meta.tone].join(' ')}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-800 truncate">{n.title}</div>
                        {n.body && <div className="text-xs text-slate-500 truncate">{n.body}</div>}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400">{formatRelative(n.created_at)}</span>
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => {
                                if (isUnread) markRead(n.id);
                                setOpen(false);
                              }}
                              className="text-[10px] text-[#0E5C3A] font-bold"
                            >
                              فتح
                            </Link>
                          )}
                          {isUnread && (
                            <button
                              onClick={() => markRead(n.id)}
                              className="text-[10px] text-emerald-700 mr-auto"
                            >
                              تعليم كمقروء
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Link
            href="/admin/notifications"
            onClick={() => setOpen(false)}
            className="block text-center py-2.5 text-sm font-bold text-[#0E5C3A] bg-slate-50 hover:bg-slate-100 border-t border-slate-100"
          >
            عرض كل الإشعارات
          </Link>
        </div>
      )}
    </div>
  );
}
