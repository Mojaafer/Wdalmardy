'use client';

import { useState } from 'react';

type Props = {
  src: string | null;
  alt: string;
  className?: string;
};

const PALETTE = ['#FBEFE2', '#CDE6D7', '#FBD8C3', '#F5E2CB', '#EAF5EF'];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

/**
 * Robust product/category image: renders a real <img> if a src is given and loads,
 * otherwise falls back to a colored placeholder with the first character of the label.
 * Avoids next/image dependencies on remote hosts during MVP.
 */
export function ProductImage({ src, alt, className = '' }: Props) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  const bg = colorFor(alt);
  const letter = alt.trim().charAt(0) || 'و';
  return (
    <div
      className={`grid place-items-center text-3xl font-extrabold text-brand-green/70 ${className}`}
      style={{ backgroundColor: bg }}
      role="img"
      aria-label={alt}
    >
      {letter}
    </div>
  );
}
