"use client";

import { useCallback, useMemo, useState } from "react";

import { findMatches, type TextMatch, type TextRange } from "@/lib/highlight";
import type { Segment } from "@/lib/types";

const NO_RANGES: TextRange[] = [];

/** In-transcript search: every match, which one is current, and the matches grouped per line. */
export function useTranscriptSearch(segments: Segment[], query: string) {
  const matches = useMemo(() => findMatches(segments.map((segment) => segment.text), query), [segments, query]);

  const rangesByLine = useMemo(() => {
    const byLine = new Map<number, TextRange[]>();
    for (const match of matches) {
      const list = byLine.get(match.segmentIndex) ?? [];
      list.push({ start: match.start, end: match.end });
      byLine.set(match.segmentIndex, list);
    }
    return byLine;
  }, [matches]);

  // The current position resets to the first match whenever the query changes.
  const [cursor, setCursor] = useState({ query, index: 0 });
  const index = matches.length === 0 ? -1 : cursor.query === query ? Math.min(cursor.index, matches.length - 1) : 0;
  const active: TextMatch | null = index >= 0 ? matches[index] : null;

  const step = useCallback(
    (delta: number) => {
      if (matches.length === 0) return;
      setCursor({ query, index: (Math.max(index, 0) + delta + matches.length) % matches.length });
    },
    [index, matches.length, query],
  );

  return {
    count: matches.length,
    index,
    active,
    next: useCallback(() => step(1), [step]),
    prev: useCallback(() => step(-1), [step]),
    rangesFor: useCallback((line: number) => rangesByLine.get(line) ?? NO_RANGES, [rangesByLine]),
  };
}
