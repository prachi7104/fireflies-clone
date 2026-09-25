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
        "group flex cursor-pointer gap-3 rounded-lg px-3 py-2.5 outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand-300",
        isActive ? "bg-brand-50 ring-1 ring-brand-100" : "hover:bg-gray-50",
      )}
    >
      <Avatar id={segment.speaker_id} name={speakerName} size="md" className="mt-0.5 ring-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900">{speakerName}</span>
          <span
            className={clsx(
              "text-xs tabular-nums",
              isActive ? "font-semibold text-brand-600" : "text-gray-400 group-hover:text-brand-600",
            )}
          >
            {formatClock(segment.start_ms)}
          </span>
        </div>
        <p className={clsx("mt-0.5 text-sm leading-6", isActive ? "text-gray-900" : "text-gray-700")}>
          <HighlightedText text={segment.text} ranges={ranges} activeRange={activeRange} />
        </p>
      </div>
    </div>
  );
});
