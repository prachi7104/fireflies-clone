"use client";

import { ArrowDownToLine } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { scrollLineIntoView, useAutoFollow } from "@/hooks/useAutoFollow";
import { useTranscriptSearch } from "@/hooks/useTranscriptSearch";
import type { MeetingParticipant, Segment } from "@/lib/types";

import { TranscriptLine } from "./TranscriptLine";
import { TranscriptSearchBar } from "./TranscriptSearchBar";

export function TranscriptPanel({
  segments,
  participants,
  activeIndex,
  onSeek,
}: {
  segments: Segment[];
  participants: MeetingParticipant[];
  activeIndex: number;
  onSeek: (ms: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const search = useTranscriptSearch(segments, query);
  const follow = useAutoFollow(containerRef, query.trim() ? -1 : activeIndex);

  const names = useMemo(() => new Map(participants.map((person) => [person.id, person.name])), [participants]);

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
    <section className="flex min-h-0 flex-col" aria-label="Transcript">
      <div className="shrink-0 border-b border-gray-200 px-4 py-3 md:px-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-gray-900">Transcript</h2>
          <span className="text-xs text-gray-500">{segments.length} lines · click a line to play from there</span>
        </div>
        <TranscriptSearchBar
          query={query}
          onQueryChange={setQuery}
          count={search.count}
          index={search.index}
          onNext={search.next}
          onPrev={search.prev}
        />
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={containerRef} className="relative h-full overflow-y-auto px-2 py-3 md:px-4" tabIndex={-1}>
          {segments.map((segment, index) => (
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
          ))}
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
