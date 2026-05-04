'use client';

import { useEffect, useState, FormEvent } from 'react';
import {
  listMessages,
  getMessage,
  replyMessage,
  updateMessageStatus,
  deleteMessage,
  type AdminMessage,
  type MessageStats,
  AdminApiError,
} from '@/lib/admin/api';
import { fmtNumber } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import StatCard from '@/components/admin/StatCard';
import Drawer from '@/components/admin/Drawer';
import {
  Inbox,
  AlertCircle,
  CheckCircle2,
  Archive,
  Trash2,
  Phone,
  MessageCircle,
  Mail,
  Search,
  StickyNote,
  Reply,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  new: 'جديدة',
  open: 'مفتوحة',
  replied: 'تم الرد',
  closed: 'مغلقة',
};
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-rose-100 text-rose-700',
  open: 'bg-amber-100 text-amber-700',
  replied: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};
const SOURCE_LABELS: Record<string, string> = {
  contact_form: 'نموذج التواصل',
  manual: 'يدوي',
  whatsapp: 'واتساب',
  order: 'طلب',
};

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [stats, setStats] = useState<MessageStats>({ total: 0, new: 0, open: 0, replied: 0, closed: 0 });
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [selected, setSelected] = useState<AdminMessage | null>(null);
  const [reply, setReply] = useState('');
  const [channel, setChannel] = useState<'note' | 'whatsapp' | 'email'>('note');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const r = await listMessages(filters);
    setMessages(r.data);
    setStats(r.meta);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, filters.status]);

  async function open(m: AdminMessage) {
    const r = await getMessage(m.id);
    setSelected(r.data);
    setReply('');
    setChannel('note');
    setError(null);
  }

  async function onReply(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSending(true);
    setError(null);
    try {
      const r = await replyMessage(selected.id, reply, channel, channel !== 'note');
      setSelected(r.data);
      setReply('');
      await refresh();

      if (channel === 'whatsapp' && selected.phone) {
        const phone = selected.phone.replace(/\D+/g, '');
        const msg = encodeURIComponent(reply);
        window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
      } else if (channel === 'email' && selected.email) {
        const subject = encodeURIComponent(selected.subject ?? 'رد من ود المرضي ماركت');
        const body = encodeURIComponent(reply);
        window.open(`mailto:${selected.email}?subject=${subject}&body=${body}`, '_blank');
      }
    } catch (e) {
      if (e instanceof AdminApiError) setError(e.message);
      else setError('فشل إرسال الرد');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: AdminMessage['status']) {
    if (!selected) return;
    const r = await updateMessageStatus(selected.id, status);
    setSelected({ ...selected, status: r.data.status, replied_at: r.data.replied_at });
    refresh();
  }

  async function onDelete(id: number) {
    if (!confirm('حذف هذه الرسالة؟')) return;
    await deleteMessage(id);
    setSelected(null);
    refresh();
  }

  return (
    <div className="space-y-4">
      <PageHeader title="الرسائل والدعم" subtitle={`${fmtNumber(stats.total)} رسالة (${fmtNumber(stats.new)} جديدة)`} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="إجمالي" value={fmtNumber(stats.total)} icon={Inbox} />
        <StatCard label="جديدة" value={fmtNumber(stats.new)} icon={AlertCircle} accent="text-rose-600" />
        <StatCard label="مفتوحة" value={fmtNumber(stats.open)} icon={MessageCircle} accent="text-amber-600" />
        <StatCard label="تم الرد" value={fmtNumber(stats.replied)} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="مغلقة" value={fmtNumber(stats.closed)} icon={Archive} accent="text-slate-500" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pr-10 pl-3 py-2 rounded-lg border border-slate-200 text-sm"
              placeholder="بحث في الرسائل..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">كل الحالات</option>
            <option value="new">جديدة</option>
            <option value="open">مفتوحة</option>
            <option value="replied">تم الرد</option>
            <option value="closed">مغلقة</option>
          </select>
        </div>

        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500 border-b border-slate-200">
                <th className="py-2 font-semibold">المرسل</th>
                <th className="py-2 font-semibold">الموضوع</th>
                <th className="py-2 font-semibold">المصدر</th>
                <th className="py-2 font-semibold">الحالة</th>
                <th className="py-2 font-semibold">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => open(m)}
                  className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${m.status === 'new' ? 'font-semibold' : ''}`}
                >
                  <td className="py-3">
                    <div className="font-bold text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500" dir="ltr">{m.phone ?? m.email ?? ''}</div>
                  </td>
                  <td className="py-3 text-slate-700 max-w-xs truncate">{m.subject || m.body.slice(0, 50)}</td>
                  <td className="py-3 text-xs text-slate-500">{SOURCE_LABELS[m.source] ?? m.source}</td>
                  <td className="py-3">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] ?? ''}`}>
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500 text-xs">{new Date(m.created_at).toLocaleString('ar-SD')}</td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    لا توجد رسائل
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title="تفاصيل الرسالة" width="max-w-2xl">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-extrabold text-slate-900">{selected.name}</div>
                <div className="text-xs text-slate-500" dir="ltr">
                  {selected.phone ?? ''} {selected.email ? `· ${selected.email}` : ''}
                </div>
                {selected.order && (
                  <a
                    href={`/admin/orders?focus=${selected.order.id}`}
                    className="text-xs inline-flex items-center gap-1 text-[#0E5C3A] mt-1"
                  >
                    مرتبطة بالطلب: {selected.order.order_number}
                  </a>
                )}
              </div>
              <span className={`text-[11px] px-2 py-1 rounded-full ${STATUS_COLORS[selected.status] ?? ''}`}>
                {STATUS_LABELS[selected.status] ?? selected.status}
              </span>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              {selected.subject && <div className="font-bold text-slate-800 mb-2">{selected.subject}</div>}
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{selected.body}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selected.phone && (
                <a
                  href={`https://wa.me/${selected.phone.replace(/\D+/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> واتساب
                </a>
              )}
              {selected.phone && (
                <a
                  href={`tel:${selected.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  <Phone className="w-3.5 h-3.5" /> اتصال
                </a>
              )}
              {selected.email && (
                <a
                  href={`mailto:${selected.email}`}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  <Mail className="w-3.5 h-3.5" /> بريد
                </a>
              )}
            </div>

            {selected.replies && selected.replies.length > 0 && (
              <div>
                <div className="text-xs font-bold text-slate-600 mb-2">سجل الردود</div>
                <ul className="space-y-2">
                  {selected.replies.map((r) => (
                    <li key={r.id} className="bg-white border border-slate-200 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-xs font-bold text-slate-700">
                          {r.user?.name ?? 'النظام'} ·{' '}
                          <span className="text-[10px] uppercase">
                            {r.channel === 'note' ? 'ملاحظة' : r.channel === 'whatsapp' ? 'واتساب' : 'بريد'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">{new Date(r.created_at).toLocaleString('ar-SD')}</div>
                      </div>
                      <div className="whitespace-pre-wrap text-slate-700">{r.body}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <div className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded">{error}</div>}

            <form onSubmit={onReply} className="space-y-2 border-t border-slate-200 pt-4">
              <div className="flex gap-1">
                {(
                  [
                    { key: 'note', label: 'ملاحظة داخلية', icon: StickyNote },
                    { key: 'whatsapp', label: 'واتساب', icon: MessageCircle },
                    { key: 'email', label: 'بريد', icon: Mail },
                  ] as const
                ).map((c) => {
                  const Icon = c.icon;
                  const active = channel === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setChannel(c.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 ${
                        active ? 'bg-[#0E5C3A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {c.label}
                    </button>
                  );
                })}
              </div>

              <textarea
                required
                rows={4}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={
                  channel === 'note'
                    ? 'ملاحظة لفريق الدعم (لن يراها العميل)'
                    : 'نص الرد للعميل…'
                }
                className="input"
              />

              <div className="flex flex-wrap gap-2 pt-1">
                <button type="submit" disabled={sending} className="bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold px-4 py-2 rounded-lg text-sm inline-flex items-center gap-1.5 disabled:opacity-50">
                  <Reply className="w-4 h-4" />
                  {sending ? 'جارٍ الإرسال…' : channel === 'note' ? 'حفظ الملاحظة' : 'إرسال + تعليم كمرد'}
                </button>
                {selected.status !== 'closed' && (
                  <button type="button" onClick={() => changeStatus('closed')} className="px-4 py-2 rounded-lg text-sm border border-slate-200 inline-flex items-center gap-1.5">
                    <Archive className="w-4 h-4" /> إغلاق
                  </button>
                )}
                {selected.status === 'closed' && (
                  <button type="button" onClick={() => changeStatus('open')} className="px-4 py-2 rounded-lg text-sm border border-slate-200">
                    إعادة فتح
                  </button>
                )}
                <button type="button" onClick={() => onDelete(selected.id)} className="px-3 py-2 rounded-lg text-sm border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center gap-1.5 ml-auto">
                  <Trash2 className="w-4 h-4" /> حذف
                </button>
              </div>
            </form>
          </div>
        )}
      </Drawer>
    </div>
  );
}
