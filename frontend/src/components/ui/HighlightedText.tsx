import clsx from "clsx";

import { splitByRanges, type TextRange } from "@/lib/highlight";

/** Renders matches as <mark> elements built from plain strings; user text never becomes HTML. */
export function HighlightedText({
  text,
  ranges,
  activeRange,
}: {
  text: string;
  ranges: TextRange[];
  activeRange?: TextRange | null;
}) {
  if (ranges.length === 0) return <>{text}</>;
  const parts = splitByRanges(text, ranges);
  const starts: number[] = [];
  let offset = 0;
  for (const part of parts) {
    starts.push(offset);
    offset += part.text.length;
  }
  return (
    <>
      {parts.map((part, index) => {
        if (!part.match) return <span key={index}>{part.text}</span>;
        const active = activeRange?.start === starts[index];
        return (
          <mark
            key={index}
            data-active={active || undefined}
            className={clsx("rounded-sm px-px text-inherit", active ? "bg-highlight-active" : "bg-highlight")}
          >
            {part.text}
          </mark>
        );
      })}
    </>
  );
}
