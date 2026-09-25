"use client";

import { formatClock } from "@/lib/format";

/** "(12:34)": Fireflies' blue timestamp link that jumps the player there. */
export function TimeLink({ ms, onSeek }: { ms: number; onSeek: (ms: number) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSeek(ms)}
      className="rounded text-link tabular-nums hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
      aria-label={`Play from ${formatClock(ms)}`}
    >
      ({formatClock(ms)})
    </button>
  );
}
