"use client";

import { ArrowDownToLine, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { scrollLineIntoView, useAutoFollow } from "@/hooks/useAutoFollow";
import { useTranscriptSearch } from "@/hooks/useTranscriptSearch";
import type { MeetingParticipant, Segment } from "@/lib/types";

import { TranscriptLine } from "./TranscriptLine";
import { TranscriptSearchBar } from "./TranscriptSearchBar";

export interface TranscriptFilter {
  label: string; // e.g. "4 questions"
  indexes: number[];
  onClear: () => void;
}

export function TranscriptPanel({
  segments,
  participants,
  activeIndex,
  onSeek,
  query,
  onQueryChange,
  filter,
}: {
  segments: Segment[];
  participants: MeetingParticipant[];
  activeIndex: number;
  onSeek: (ms: number) => void;
  query: string;
  onQueryChange: (value: string) => void;
  filter: TranscriptFilter | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const search = useTranscriptSearch(segments, query);
  const follow = useAutoFollow(containerRef, query.trim() ? -1 : activeIndex);

  const names = useMemo(() => new Map(participants.map((person) => [person.id, person.name])), [participants]);
  // A Smart Search filter shows only some lines; each keeps its real index so sync and scrolling still work.
  const visible = useMemo(() => filter?.indexes ?? segments.map((_, index) => index), [filter, segments]);

  // Stable handler, so memoised lines don't all re-render on every clock tick.
  const { resume } = follow;
  const seekFromLine = useCallback(
    (ms: number) => {
      resume();
      onSeek(ms);
    },
    [resume, onSeek],
  );

  // Bring the current search match into view whenever it changes.
  const activeLine = search.active?.segmentIndex ?? -1;
  const activeStart = search.active?.start ?? -1;
  useEffect(() => {
    if (activeLine >= 0) scrollLineIntoView(containerRef.current, activeLine);
  }, [activeLine, activeStart]);

  return (
    <section className="flex h-full min-h-0 flex-col" aria-label="Transcript">
      <div className="shrink-0 px-4 pb-2 pt-3">
        <TranscriptSearchBar
          query={query}
          onQueryChange={onQueryChange}
          count={search.count}
          index={search.index}
          onNext={search.next}
          onPrev={search.prev}
        />
        {filter ? (
          <div className="mt-2 flex items-center justify-between rounded-md bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
            <span>Showing {filter.label}</span>
            <button
              type="button"
              onClick={filter.onClear}
              className="inline-flex items-center gap-1 font-medium hover:underline"
            >
              <X className="size-3.5" /> Clear
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={containerRef}
          className="relative h-full overflow-y-auto px-2 pb-6"
          tabIndex={-1}
          title="Click a line to play from there"
        >
          {visible.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-gray-500">No lines match this filter.</p>
          ) : (
            visible.map((index) => {
              const segment = segments[index];
              return (
                <TranscriptLine
                  key={segment.id}
                  index={index}
                  segment={segment}
                  speakerName={names.get(segment.speaker_id) ?? "Unknown speaker"}
                  isActive={index === activeIndex}
                  ranges={search.rangesFor(index)}
                  activeRange={search.active && search.active.segmentIndex === index ? search.active : null}
                  onSeek={seekFromLine}
                />
              );
            })
          )}
        </div>
        {!follow.following && !query.trim() ? (
          <button
            type="button"
            onClick={() => {
              follow.resume();
              scrollLineIntoView(containerRef.current, activeIndex);
            }}
            className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gray-900 px-3.5 py-2 text-xs font-medium text-canvas shadow-popover hover:bg-gray-700"
          >
            <ArrowDownToLine className="size-3.5" /> Resume auto-scroll
          </button>
        ) : null}
      </div>
    </section>
  );
}
