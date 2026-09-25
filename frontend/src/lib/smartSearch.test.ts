import { describe, expect, it } from "vitest";

import { matchSmartFilter, smartFilterIndexes, speakerStats } from "./smartSearch";
import type { Segment } from "./types";

const seg = (id: number, speaker_id: number, start_ms: number, end_ms: number, text: string): Segment => ({
  id,
  position: id,
  speaker_id,
  start_ms,
  end_ms,
  text,
});

describe("matchSmartFilter", () => {
  it("finds questions by their question mark", () => {
    expect(matchSmartFilter("questions", "Can you send it by Friday?")).toBe(true);
    expect(matchSmartFilter("questions", "Send it by Friday.")).toBe(false);
  });

  it("finds metrics: percentages, money and counted quantities", () => {
    expect(matchSmartFilter("metrics", "Conversion rose 12% last week")).toBe(true);
    expect(matchSmartFilter("metrics", "It costs $40 per seat")).toBe(true);
    expect(matchSmartFilter("metrics", "We onboarded 350 customers")).toBe(true);
    expect(matchSmartFilter("metrics", "We shipped three things")).toBe(false);
    expect(matchSmartFilter("metrics", "Let's meet at 3pm")).toBe(false);
  });

  it("finds dates and times", () => {
    expect(matchSmartFilter("dates", "Let's ship it next Tuesday")).toBe(true);
    expect(matchSmartFilter("dates", "Send it by tomorrow at 3pm")).toBe(true);
    expect(matchSmartFilter("dates", "The chart looks fine")).toBe(false);
  });
});

describe("smartFilterIndexes", () => {
  it("uses action-item segment ids for tasks", () => {
    const segments = [seg(1, 1, 0, 1000, "Hello."), seg(2, 1, 1000, 2000, "I'll do it.")];
    expect(smartFilterIndexes("tasks", segments, new Set([2]))).toEqual([1]);
  });

  it("returns matching line indexes for text filters", () => {
    const segments = [seg(1, 1, 0, 1000, "Ready?"), seg(2, 1, 1000, 2000, "Yes."), seg(3, 2, 2000, 3000, "Now?")];
    expect(smartFilterIndexes("questions", segments, new Set())).toEqual([0, 2]);
  });
});

describe("speakerStats", () => {
  it("computes talk share and words per minute per speaker", () => {
    const segments = [
      seg(1, 1, 0, 60_000, Array(120).fill("word").join(" ")),
      seg(2, 2, 60_000, 90_000, Array(30).fill("word").join(" ")),
    ];
    const stats = speakerStats(segments, [
      { id: 1, name: "Ann" },
      { id: 2, name: "Bob" },
    ]);
    expect(stats.map((s) => [s.name, s.share, s.wpm])).toEqual([
      ["Ann", 67, 120],
      ["Bob", 33, 60],
    ]);
  });

  it("keeps rounded shares summing to 100", () => {
    const segments = [seg(1, 1, 0, 1000, "a"), seg(2, 2, 1000, 2000, "b"), seg(3, 3, 2000, 3000, "c")];
    const people = [1, 2, 3].map((id) => ({ id, name: `P${id}` }));
    expect(speakerStats(segments, people).reduce((sum, s) => sum + s.share, 0)).toBe(100);
  });

  it("handles an empty transcript", () => {
    expect(speakerStats([], [])).toEqual([]);
  });
});
