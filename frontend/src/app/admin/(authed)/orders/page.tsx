'use client';

import { useEffect, useState } from 'react';
import {
  listOrders,
  getOrder,
  updateOrderStatus,
  resendWhatsapp,
  downloadInvoice,
  type AdminOrder,
} from '@/lib/admin/api';
import { fmtSDG, fmtDate, STATUS_LABELS, STATUS_COLORS } from '@/lib/admin/format';
import PageHeader from '@/components/admin/PageHeader';
import { Search, MessageCircle, Printer, ShoppingBag, MapPin } from 'lucide-react';

const STATUSES: { value: string; label: string }[] = [
  { value: '', label: 'الكل' },
  { value: 'new', label: 'جديد' },
  { value: 'preparing', label: 'قيد التحضير' },
  { value: 'shipped', label: 'قيد التوصيل' },
  { value: 'delivered', label: 'تم التوصيل' },
  { value: 'cancelled', label: 'ملغي' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });
  const [filters, setFilters] = useState({ status: '', q: '', page: 1 });
  const [selected, setSelected] = useState<AdminOrder | null>(null);

  async function refresh() {
    const r = await listOrders({
      status: filters.status,
      q: filters.q,
      page: filters.page,
    });
    setOrders(r.data);
    setMeta(r.meta);
    if (selected) {
      const fresh = r.data.find((o) => o.id === selected.id);
      if (fresh) setSelected(fresh);
    } else if (r.data[0]) {
      setSelected(r.data[0]);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.q, filters.page]);

  async function changeStatus(status: string) {
    if (!selected) return;
    const r = await updateOrderStatus(selected.id, status);
    setSelected(r.data);
    refresh();
  }

  async function whatsapp() {
    if (!selected) return;
    const r = await resendWhatsapp(selected.id);
    window.open(r.data.whatsapp_url, '_blank');
  }

  async function selectOrder(id: number) {
    const r = await getOrder(id);
    setSelected(r.data);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="إدارة الطلبات" subtitle={`${meta.total} طلب`} />

      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUSES.map((s) => (
          <button
            key={s.value || 'all'}
            onClick={() => setFilters((f) => ({ ...f, status: s.value, page: 1 }))}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
              filters.status === s.value
                ? 'bg-[#0E5C3A] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-3 border-b border-slate-100 relative">
            <Search className="w-4 h-4 absolute right-6 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث برقم الطلب أو اسم العميل..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
              className="w-full pr-9 pl-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
            {orders.length === 0 ? (
              <div className="p-10 text-center text-slate-400">لا توجد طلبات</div>
            ) : (
              orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => selectOrder(o.id)}
                  className={`w-full text-right flex items-center gap-3 p-3 hover:bg-slate-50 ${
                    selected?.id === o.id ? 'bg-[#FBEFE2]' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#0E5C3A]/10 text-[#0E5C3A] grid place-items-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold truncate">{o.customer_name}</span>
                      <span className="text-[11px] text-slate-400">#{o.order_number}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {fmtDate(o.created_at)} · {o.items.length} منتج
                    </div>
                  </div>
                  <div className="text-left shrink-0">
                    <div className="font-extrabold text-sm">{fmtSDG(o.total)}</div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        STATUS_COLORS[o.status] ?? ''
                      }`}
                    >
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
          {meta.last_page > 1 && (
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                صفحة {meta.current_page} من {meta.last_page}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50"
                >
                  السابق
                </button>
                <button
                  disabled={filters.page >= meta.last_page}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  className="px-3 py-1 border border-slate-200 rounded disabled:opacity-50"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-xl p-10 text-center text-slate-400 border border-slate-100">
              اختر طلباً لعرض التفاصيل
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-l from-[#0E5C3A] to-[#0a4429] text-white">
                <div className="text-xs opacity-80">رقم الطلب</div>
                <div className="font-extrabold text-xl">{selected.order_number}</div>
                <div className="text-xs opacity-80 mt-1">{fmtDate(selected.created_at)}</div>
              </div>

              <div className="p-5 space-y-4">
                <Section title="العميل">
                  <div className="font-bold">{selected.customer_name}</div>
                  <div className="text-sm text-slate-500" dir="ltr">{selected.customer_phone}</div>
                  {selected.customer_email && (
                    <div className="text-sm text-slate-500" dir="ltr">{selected.customer_email}</div>
                  )}
                </Section>

                {selected.delivery_method === 'delivery' && (
                  <Section title="عنوان التوصيل">
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 mt-0.5 text-[#F26B2B]" />
                      <span>
                        {selected.address_state} / {selected.address_district}
                        {selected.address_details && ` — ${selected.address_details}`}
                      </span>
                    </div>
                  </Section>
                )}

                <Section title="المنتجات">
                  <div className="space-y-2">
                    {selected.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-sm">
                        <span className="flex-1">
                          {it.name_ar} × {it.quantity}
                        </span>
                        <span className="font-bold">{fmtSDG(it.line_total)}</span>
                      </div>
                    ))}
                  </div>
                </Section>

                <div className="border-t border-slate-100 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">المجموع الفرعي</span>
                    <span>{fmtSDG(selected.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">رسوم التوصيل</span>
                    <span>{fmtSDG(selected.delivery_fee)}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-[#F26B2B] pt-1 border-t border-dashed border-slate-200">
                    <span>الإجمالي</span>
                    <span>{fmtSDG(selected.total)}</span>
                  </div>
                </div>

                {selected.notes && (
                  <Section title="ملاحظات">
                    <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                      {selected.notes}
                    </div>
                  </Section>
                )}

                <Section title="حالة الطلب">
                  <div className="grid grid-cols-2 gap-2">
                    {['new', 'preparing', 'shipped', 'delivered', 'cancelled'].map((s) => (
                      <button
                        key={s}
                        onClick={() => changeStatus(s)}
                        className={`px-3 py-2 rounded-lg text-xs font-bold ${
                          selected.status === s
                            ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </Section>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={whatsapp}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg text-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    إرسال واتساب
                  </button>
                  <button
                    onClick={() =>
                      downloadInvoice(selected.id, `invoice-${selected.order_number}.pdf`)
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0E5C3A] hover:bg-[#0a4429] text-white font-bold py-2 rounded-lg text-sm"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة الفاتورة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{title}</div>
      {children}
    </div>
  );
}
