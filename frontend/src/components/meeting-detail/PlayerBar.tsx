"use client";

import clsx from "clsx";
import { Gauge, Pause, Play, RotateCcw, RotateCw } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import type { PlaybackClock } from "@/hooks/usePlaybackClock";
import { formatClock } from "@/lib/format";
import type { Chapter } from "@/lib/types";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export function PlayerBar({ clock, durationMs, chapters }: { clock: PlaybackClock; durationMs: number; chapters: Chapter[] }) {
  const progress = durationMs > 0 ? (clock.currentMs / durationMs) * 100 : 0;
  return (
    <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={() => clock.skip(-15_000)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Back 15 seconds"
          title="Back 15s"
        >
          <RotateCcw className="size-4" />
        </button>
        <button
          type="button"
          onClick={clock.toggle}
          className="flex size-10 items-center justify-center rounded-full bg-brand-500 text-white shadow-card hover:bg-brand-700"
          aria-label={clock.isPlaying ? "Pause" : "Play"}
        >
          {clock.isPlaying ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
        </button>
        <button
          type="button"
          onClick={() => clock.skip(15_000)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Forward 15 seconds"
          title="Forward 15s"
        >
          <RotateCw className="size-4" />
        </button>

        <span className="w-14 text-right text-xs font-medium tabular-nums text-gray-600">{formatClock(clock.currentMs)}</span>

        <div className="relative flex h-6 flex-1 items-center">
          <div className="pointer-events-none absolute inset-x-0 h-1.5 rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} />
          </div>
          {chapters.slice(1).map((chapter) => (
            <span
              key={chapter.id}
              title={chapter.title}
              className="pointer-events-none absolute h-3 w-0.5 rounded bg-white ring-1 ring-gray-300"
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
              "relative h-6 w-full cursor-pointer appearance-none bg-transparent",
              "[&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
              "[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-brand-500",
              "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-500",
            )}
          />
        </div>

        <span className="w-14 text-xs font-medium tabular-nums text-gray-500">{formatClock(durationMs)}</span>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            aria-label="Playback speed"
          >
            <Gauge className="size-4" />
            {clock.rate}x
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-24">
            {SPEEDS.map((speed) => (
              <DropdownMenuItem
                key={speed}
                onSelect={() => clock.setRate(speed)}
                className={speed === clock.rate ? "font-semibold text-brand-700" : undefined}
              >
                {speed}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="mt-1 hidden text-center text-[11px] text-gray-400 md:block">
        Simulated playback: there&apos;s no audio for these transcripts, so the player follows the transcript timeline.
      </p>
    </div>
  );
}
