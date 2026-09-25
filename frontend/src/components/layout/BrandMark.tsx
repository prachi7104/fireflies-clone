import Link from "next/link";

/** Our own mark in the Fireflies style: a magenta tile with a geometric "F" (not the Fireflies logo file). */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <Link
      href="/"
      aria-label="Home"
      className="inline-flex rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
    >
      <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden>
        <defs>
          <linearGradient id="brand-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff4f9a" />
            <stop offset="1" stopColor="#d61f69" />
          </linearGradient>
        </defs>
        <rect width="28" height="28" rx="7" fill="url(#brand-mark)" />
        <rect x="8" y="7" width="12" height="3.5" rx="1" fill="#fff" />
        <rect x="8" y="12.5" width="8.5" height="3.5" rx="1" fill="#fff" />
        <rect x="8" y="7" width="3.5" height="14" rx="1" fill="#fff" />
      </svg>
    </Link>
  );
}
