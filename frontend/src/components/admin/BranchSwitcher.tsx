'use client';

import { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { listBranches } from '@/lib/admin/api';
import { useBranchContext } from '@/lib/admin/branchContext';

/**
 * Compact branch selector for the admin top bar. Loads branches once on mount,
 * seeds the shared branch-context store, and lets the admin switch which
 * branch branch-sensitive pages (products, inventory, POS) operate on.
 *
 * Hidden entirely when there is only a single branch (nothing to switch).
 */
export default function BranchSwitcher() {
  const { branches, loaded, setBranches, setCurrent, current } = useBranchContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Skip the fetch if branches are already populated (e.g. another instance
    // of the switcher, or a hot reload with persisted state).
    if (loaded && branches.length > 0) return;
    let cancelled = false;
    listBranches()
      .then((res) => {
        if (cancelled) return;
        setBranches(
          res.data.map((b) => ({
            id: b.id,
            name_ar: b.name_ar,
            is_main: b.is_main,
            status: b.status,
          })),
        );
      })
      .catch(() => {
        // Branches are an enhancement; failure shouldn't break the shell.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Nothing to switch between — don't render the control.
  if (loaded && branches.length <= 1) return null;

  const active = current();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        title="اختيار الفرع"
      >
        <Building2 className="w-4 h-4 text-[#0E5C3A]" />
        <span className="max-w-[120px] truncate">{active ? active.name_ar : 'كل الفروع'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 max-h-72 overflow-y-auto">
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setCurrent(b.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-right hover:bg-slate-50"
            >
              <span className="flex-1 truncate">{b.name_ar}</span>
              {b.is_main && (
                <span className="text-[10px] bg-emerald-50 text-[#0E5C3A] px-1.5 py-0.5 rounded font-bold">
                  رئيسي
                </span>
              )}
              {active?.id === b.id && <Check className="w-4 h-4 text-[#0E5C3A]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
