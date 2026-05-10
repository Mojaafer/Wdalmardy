'use client';

import Image from 'next/image';

const PALETTE = [
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-orange-100 text-orange-700',
];

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] ?? '') + (parts[1][0] ?? '');
}

export default function EmployeeAvatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    const src = url.startsWith('http')
      ? url
      : `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ?? ''}${url}`;
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover border border-slate-200"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full grid place-items-center font-bold ${colorFor(name)}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name).toUpperCase()}
    </div>
  );
}
