'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, ShoppingCart, AlertTriangle, Inbox, CheckCheck, Trash2 } from 'lucide-react';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  type AdminNotificationItem,
} from '@/lib/admin/api';

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  order_new: { label: 'طلب جديد', icon: ShoppingCart, tone: 'bg-emerald-50 text-emerald-700' },
  low_stock: { label: 'نفاد مخزون', icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700' },
  message_new: { label: 'رسالة', icon: Inbox, tone: 'bg-blue-50 text-blue-700' },
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.round(diffMs / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} د`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.round(h / 24);
  return `منذ ${d} يوم`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<AdminNotificationItem[]>([]);
  const [meta, setMeta] = useState({ total: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [type, setType] = useState<string>('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (filter === 'unread') params.unread = 1;
      if (type) params.type = type;
      const res = await listNotifications(params);
      setItems(res.data);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, [filter, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function markRead(id: number) {
    await markNotificationRead(id);
    refresh();
  }

  async function readAll() {
    await markAllNotificationsRead();
    refresh();
  }

  async function remove(id: number) {
    await deleteNotification(id);
    refresh();
  }

  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#0E5C3A]" />
            الإشعارات
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {meta.total} إشعار • {meta.unread} غير مقروءة
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={readAll}
            disabled={meta.unread === 0}
            className="bg-[#0E5C3A] hover:bg-[#0a4a2e] disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            تعليم الكل كمقروء
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-white border border-slate-200 rounded-lg p-1">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'px-3 py-1.5 text-sm rounded-md transition-colors',
                filter === f
                  ? 'bg-[#0E5C3A] text-white'
                  : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')}
            >
              {f === 'all' ? 'الكل' : 'غير المقروءة'}
            </button>
          ))}
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">كل الأنواع</option>
          <option value="order_new">طلب جديد</option>
          <option value="low_stock">نفاد مخزون</option>
          <option value="message_new">رسائل</option>
        </select>
      </div>

      <section className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400">جاري التحميل...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-slate-400">لا توجد إشعارات</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => {
              const meta = TYPE_META[n.type] ?? {
                label: n.type,
                icon: Bell,
                tone: 'bg-slate-100 text-slate-600',
              };
              const Icon = meta.icon;
              const unread = !n.read_at;
              return (
                <li
                  key={n.id}
                  className={[
                    'flex items-start gap-3 p-4 hover:bg-slate-50',
                    unread ? 'bg-emerald-50/30' : '',
                  ].join(' ')}
                >
                  <span className={['p-2 rounded-lg flex-shrink-0', meta.tone].join(' ')}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase text-slate-400">{meta.label}</span>
                      {unread && <span className="w-2 h-2 rounded-full bg-[#F26B2B]" />}
                      <span className="text-[11px] text-slate-400">{formatRelative(n.created_at)}</span>
                    </div>
                    <div className="font-bold text-slate-800 mt-0.5">{n.title}</div>
                    {n.body && <div className="text-sm text-slate-600 mt-0.5">{n.body}</div>}
                    {n.link && (
                      <Link
                        href={n.link}
                        className="text-[#0E5C3A] text-sm font-bold mt-1 inline-block"
                      >
                        فتح →
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {unread && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded"
                      >
                        تعليم كمقروء
                      </button>
                    )}
                    <button
                      onClick={() => remove(n.id)}
                      className="text-rose-600 hover:bg-rose-50 p-1.5 rounded"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
