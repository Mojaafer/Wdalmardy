export default function AdminLoading() {
  return (
    <div className="min-h-[60vh] grid place-items-center p-8">
      <div className="flex flex-col items-center gap-3">
        <span
          className="h-12 w-12 rounded-full border-4 border-slate-300 border-t-slate-700 animate-spin"
          aria-hidden
        />
        <p className="text-sm text-slate-500">جارٍ التحميل…</p>
      </div>
    </div>
  );
}