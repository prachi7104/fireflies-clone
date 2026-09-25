"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

export function TranscriptSearchBar({
  query,
  onQueryChange,
  count,
  index,
  onNext,
  onPrev,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  count: number;
  index: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  const hasQuery = query.trim().length > 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (event.shiftKey) onPrev();
              else onNext();
            } else if (event.key === "Escape") {
              onQueryChange("");
            }
          }}
          placeholder="Search in transcript"
          aria-label="Search in transcript"
          className="h-9 w-full rounded-lg border border-gray-300 bg-surface pl-9 pr-24 text-sm shadow-card placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 [&::-webkit-search-cancel-button]:hidden"
        />
        {hasQuery ? (
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            <span className="px-1 text-xs tabular-nums text-gray-500" aria-live="polite">
              {count === 0 ? "No results" : `${index + 1} of ${count}`}
            </span>
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="rounded p-1 text-gray-400 hover:text-gray-700"
              aria-label="Clear transcript search"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onPrev}
        disabled={count === 0}
        className="rounded-md border border-gray-300 bg-surface p-1.5 text-gray-600 shadow-card hover:bg-gray-50 disabled:opacity-40"
        aria-label="Previous match"
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={count === 0}
        className="rounded-md border border-gray-300 bg-surface p-1.5 text-gray-600 shadow-card hover:bg-gray-50 disabled:opacity-40"
        aria-label="Next match"
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}
