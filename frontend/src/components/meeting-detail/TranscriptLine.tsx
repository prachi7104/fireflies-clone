"use client";

import clsx from "clsx";
import { memo } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { HighlightedText } from "@/components/ui/HighlightedText";
import { formatClock } from "@/lib/format";
import type { TextRange } from "@/lib/highlight";
import type { Segment } from "@/lib/types";

// Memoised: while playing, only the lines whose props change (the old and new active line) re-render.
export const TranscriptLine = memo(function TranscriptLine({
  index,
  segment,
  speakerName,
  isActive,
  ranges,
  activeRange,
  onSeek,
}: {
  index: number;
  segment: Segment;
  speakerName: string;
  isActive: boolean;
  ranges: TextRange[];
  activeRange: TextRange | null;
  onSeek: (ms: number) => void;
}) {
  return (
    <div
      data-line-index={index}
      role="button"
      tabIndex={0}
      aria-current={isActive ? "true" : undefined}
      aria-label={`${speakerName} at ${formatClock(segment.start_ms)}: play from here`}
      onClick={() => onSeek(segment.start_ms)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSeek(segment.start_ms);
        }
      }}
      className={clsx(
        "group cursor-pointer rounded-lg border-l-2 px-3 py-2.5 outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand-300",
        isActive ? "border-brand-500 bg-brand-25" : "border-transparent hover:bg-raised",
      )}
    >
      <div className="flex items-center gap-2">
        <Avatar id={segment.speaker_id} name={speakerName} size="sm" square className="ring-0" />
        <span className="text-sm font-medium text-gray-900">{speakerName}</span>
        <span aria-hidden className="text-gray-300">
          ·
        </span>
        <span className="text-sm tabular-nums text-link group-hover:underline">{formatClock(segment.start_ms)}</span>
      </div>
      <p className={clsx("mt-1.5 text-[15px] leading-7", isActive ? "text-gray-900" : "text-gray-700")}>
        <HighlightedText text={segment.text} ranges={ranges} activeRange={activeRange} />
      </p>
    </div>
  );
});
