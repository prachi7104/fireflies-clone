"use client";

import clsx from "clsx";
import { ChevronUp, Search } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import type { SmartFilter, SpeakerStat } from "@/lib/smartSearch";

const FILTERS: { value: SmartFilter; label: string; dot: string }[] = [
  { value: "questions", label: "Questions", dot: "bg-pink-400" },
  { value: "tasks", label: "Tasks", dot: "bg-orange-400" },
  { value: "metrics", label: "Metrics", dot: "bg-cyan-400" },
  { value: "dates", label: "Date & Time", dot: "bg-teal-400" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-b border-line px-4 py-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-400 hover:text-gray-600"
      >
        {title}
        <ChevronUp className={clsx("size-4 transition-transform", open ? "" : "rotate-180")} />
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

/**
 * Fireflies' "Smart Search" column. Every number here is computed from this meeting's transcript
 * (see lib/smartSearch.ts); clicking a filter narrows the transcript to the matching lines.
 */
export function SmartSearchPanel({
  counts,
  active,
  onFilter,
  speakers,
  keywords,
  onKeyword,
}: {
  counts: Record<SmartFilter, number>;
  active: SmartFilter | null;
  onFilter: (filter: SmartFilter | null) => void;
  speakers: SpeakerStat[];
  keywords: string[];
  onKeyword: (keyword: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto" aria-label="Smart Search">
      <div className="flex h-12 items-center gap-2 border-b border-line px-4 text-sm font-medium text-gray-900">
        <Search className="size-4 text-gray-500" /> Smart Search
      </div>

      <Section title="AI filters">
        <div className="grid grid-cols-2 gap-1.5">
          {FILTERS.map((filter) => {
            const selected = active === filter.value;
            const count = counts[filter.value];
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={selected}
                disabled={count === 0}
                onClick={() => onFilter(selected ? null : filter.value)}
                className={clsx(
                  "flex items-center gap-1.5 rounded px-2 py-2 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  "focus-visible:outline-2 focus-visible:outline-brand-500",
                  selected ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "bg-raised text-gray-700 hover:bg-gray-100",
                )}
              >
                <span className={clsx("size-1.5 shrink-0 rounded-full", filter.dot)} aria-hidden />
                <span className="flex-1 truncate">{filter.label}</span>
                <span className="text-xs tabular-nums text-gray-500">{count}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Speaker talktime">
        <div className="mb-2 grid grid-cols-[1fr_3rem_3rem] text-[11px] uppercase tracking-wide text-gray-400">
          <span>Speakers</span>
          <span className="text-right">WPM</span>
          <span className="text-right">Talk</span>
        </div>
        <ul className="space-y-2.5">
          {speakers.map((speaker) => (
            <li key={speaker.id}>
              <div className="grid grid-cols-[1fr_3rem_3rem] items-center text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar id={speaker.id} name={speaker.name} size="xs" square className="ring-0" />
                  <span className="truncate text-gray-700">{speaker.name}</span>
                </span>
                <span className="text-right tabular-nums text-gray-500">{speaker.wpm}</span>
                <span className="text-right tabular-nums text-gray-700">{speaker.share}%</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${speaker.share}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Topic trackers">
        {keywords.length === 0 ? (
          <p className="text-sm text-gray-500">No topics found in this meeting.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {keywords.map((keyword) => (
              <button
                key={keyword}
                type="button"
                onClick={() => onKeyword(keyword)}
                className="rounded bg-raised px-2 py-1 text-xs text-gray-700 ring-1 ring-line hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-brand-500"
                title={`Find "${keyword}" in the transcript`}
              >
                {keyword}
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
