"use client";

import clsx from "clsx";
import { Info, Pause, Play, RotateCcw, RotateCw } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { Tooltip } from "@/components/ui/Tooltip";
import type { PlaybackClock } from "@/hooks/usePlaybackClock";
import { formatClock } from "@/lib/format";
import type { Chapter } from "@/lib/types";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

const iconButton =
  "rounded-full p-2 text-gray-500 hover:bg-raised hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-brand-500";

/** Full-width player along the bottom of the meeting page, like Fireflies. */
export function PlayerBar({ clock, durationMs, chapters }: { clock: PlaybackClock; durationMs: number; chapters: Chapter[] }) {
  const progress = durationMs > 0 ? (clock.currentMs / durationMs) * 100 : 0;
  return (
    <div className="shrink-0 border-t border-line bg-surface">
      {/* Seek track across the full width; the range input on top of it handles mouse, touch and keys. */}
      <div className="group relative flex h-3 items-center">
        <div className="pointer-events-none absolute inset-x-0 h-1 bg-gray-200 transition-all group-hover:h-1.5">
          <div className="h-full bg-brand-500" style={{ width: `${progress}%` }} />
        </div>
        {chapters.slice(1).map((chapter) => (
          <span
            key={chapter.id}
            title={chapter.title}
            className="pointer-events-none absolute h-2.5 w-0.5 bg-surface"
            style={{ left: `${(chapter.start_ms / Math.max(durationMs, 1)) * 100}%` }}
          />
        ))}
        <input
          type="range"
          min={0}
          max={durationMs}
          step={1000}
          value={Math.round(clock.currentMs)}
          onChange={(event) => clock.seek(Number(event.target.value))}
          aria-label="Seek"
          aria-valuetext={`${formatClock(clock.currentMs)} of ${formatClock(durationMs)}`}
          className={clsx(
            "relative h-3 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none",
            "[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:opacity-0 group-hover:[&::-webkit-slider-thumb]:opacity-100",
            "focus-visible:[&::-webkit-slider-thumb]:opacity-100 focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-brand-200",
            "[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand-500",
          )}
        />
      </div>

      <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center px-3 sm:px-4">
        <p className="text-sm tabular-nums text-gray-900">
          {formatClock(clock.currentMs)} <span className="text-gray-400">/ {formatClock(durationMs)}</span>
        </p>

        <div className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="hidden h-8 min-w-10 items-center justify-center rounded-md px-2 text-sm font-medium text-gray-600 hover:bg-raised min-[400px]:inline-flex"
              aria-label={`Playback speed ${clock.rate}×`}
            >
              {clock.rate}×
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-24">
              {SPEEDS.map((speed) => (
                <DropdownMenuItem
                  key={speed}
                  onSelect={() => clock.setRate(speed)}
                  className={speed === clock.rate ? "font-semibold text-brand-700" : undefined}
                >
                  {speed}×
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" onClick={() => clock.skip(-15_000)} className={iconButton} aria-label="Back 15 seconds">
            <RotateCcw className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={clock.toggle}
            className="flex size-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-card hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            aria-label={clock.isPlaying ? "Pause" : "Play"}
          >
            {clock.isPlaying ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
          </button>
          <button type="button" onClick={() => clock.skip(15_000)} className={iconButton} aria-label="Forward 15 seconds">
            <RotateCw className="size-[18px]" />
          </button>
        </div>

        <div className="flex justify-end">
          <Tooltip
            side="top"
            label="Simulated playback: there's no audio for these transcripts, so the player follows the transcript timeline."
          >
            <button type="button" className={iconButton} aria-label="About playback">
              <Info className="size-[18px]" />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
