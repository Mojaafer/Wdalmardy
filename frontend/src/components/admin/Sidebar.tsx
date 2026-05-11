'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  ShieldCheck,
  Megaphone,
  Building2,
  UserCog,
  Ticket,
  Boxes,
  FileText,
  Inbox,
  Receipt,
  Barcode,
  Award,
  ScanLine,
  type LucideIcon,
} from 'lucide-react';
import type { AdminUser } from '@/lib/admin/api';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  comingSoon?: boolean;
};

export default function Sidebar({ user }: { user: AdminUser }) {
  const pathname = usePathname();

  const items: NavItem[] = useMemo(
    () => [
      { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, permission: 'dashboard.view' },
      { href: '/admin/products', label: 'إدارة المنتجات', icon: Package, permission: 'products.view' },
      { href: '/admin/categories', label: 'إدارة الأقسام', icon: Tag, permission: 'categories.view' },
      { href: '/admin/orders', label: 'إدارة الطلبات', icon: ShoppingCart, permission: 'orders.view' },
      { href: '/admin/customers', label: 'إدارة العملاء', icon: Users, permission: 'customers.view' },
      { href: '/admin/offers', label: 'العروض والخصومات', icon: Megaphone, permission: 'offers.view' },
      { href: '/admin/coupons', label: 'كوبونات الخصم', icon: Ticket, permission: 'coupons.view' },
      { href: '/admin/suppliers', label: 'الموردين', icon: Building2, permission: 'suppliers.view' },
      { href: '/admin/employees', label: 'الموظفين', icon: UserCog, permission: 'employees.view' },
      { href: '/admin/inventory', label: 'إدارة المخزون', icon: Boxes, permission: 'inventory.view' },
      { href: '/admin/barcodes', label: 'الباركود', icon: Barcode, permission: 'products.view' },
      { href: '/admin/loyalty', label: 'برنامج الولاء', icon: Award, permission: 'customers.view' },
      { href: '/admin/delivery', label: 'إدارة التوصيل', icon: Truck, permission: 'delivery.view' },
      { href: '/admin/pos', label: 'نقطة البيع', icon: ScanLine, permission: 'pos.operate' },
      { href: '/admin/invoices', label: 'الفواتير', icon: Receipt, permission: 'invoices.view' },
      { href: '/admin/messages', label: 'الرسائل والدعم', icon: Inbox, permission: 'messages.view' },
      { href: '/admin/pages', label: 'الصفحات', icon: FileText, permission: 'pages.view' },
      { href: '/admin/reports', label: 'التقارير', icon: BarChart3, permission: 'reports.view' },
      { href: '/admin/permissions', label: 'صلاحيات المدير', icon: ShieldCheck, permission: 'employees.manage' },
      { href: '/admin/settings', label: 'إعدادات النظام', icon: Settings, permission: 'settings.manage' },
    ],
    [],
  );

  const can = (perm?: string) => !perm || user.permissions.includes(perm);

  const visible = items.filter((it) => can(it.permission));

  return (
    <aside className="hidden lg:flex w-64 bg-white border-l border-slate-200 flex-col h-screen sticky top-0 overflow-y-auto">
      <Link href="/admin" className="px-5 py-5 border-b border-slate-200 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0E5C3A] text-white grid place-items-center font-extrabold">
          ود
        </div>
        <div>
          <div className="font-extrabold text-[#0E5C3A]">ود المرضي</div>
          <div className="text-[11px] text-slate-500">لوحة التحكم</div>
        </div>
      </Link>

      <nav className="flex-1 p-3 space-y-1">
        {visible.map((it) => {
          const active =
            it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.comingSoon ? '#' : it.href}
              onClick={(e) => it.comingSoon && e.preventDefault()}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#0E5C3A] text-white'
                  : 'text-slate-600 hover:bg-slate-100',
                it.comingSoon ? 'opacity-50 cursor-not-allowed' : '',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{it.label}</span>
              {it.comingSoon && (
                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  قريباً
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 text-[11px] text-slate-400 text-center">
        © {new Date().getFullYear()} ود المرضي ماركت
      </div>
    </aside>
  );
}
