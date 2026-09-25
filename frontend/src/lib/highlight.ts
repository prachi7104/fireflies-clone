// Plain-string search used for highlighting. No regex (so "(est.)" matches literally) and no raw HTML.

export type TextRange = { start: number; end: number };
export type TextMatch = TextRange & { segmentIndex: number };

export function findRanges(text: string, query: string): TextRange[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const haystack = text.toLowerCase();
  const ranges: TextRange[] = [];
  let from = 0;
  for (let at = haystack.indexOf(needle, from); at !== -1; at = haystack.indexOf(needle, from)) {
    ranges.push({ start: at, end: at + needle.length });
    from = at + needle.length;
  }
  return ranges;
}

/** Every match across all transcript lines, in reading order. */
export function findMatches(texts: string[], query: string): TextMatch[] {
  return texts.flatMap((text, segmentIndex) => findRanges(text, query).map((range) => ({ segmentIndex, ...range })));
}

/** Cut text into plain and highlighted pieces, ready to render as React text nodes. */
export function splitByRanges(text: string, ranges: TextRange[]): { text: string; match: boolean }[] {
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const start = Math.max(cursor, range.start);
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    if (range.end > start) parts.push({ text: text.slice(start, range.end), match: true });
    cursor = Math.max(cursor, range.end);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}
