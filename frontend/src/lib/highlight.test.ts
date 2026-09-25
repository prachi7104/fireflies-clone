import { describe, expect, it } from "vitest";

import { findMatches, splitByRanges } from "./highlight";

describe("findMatches", () => {
  it("is case-insensitive across segments", () => {
    expect(findMatches(["Pricing and pricing", "no", "PRICING"], "pricing")).toEqual([
      { segmentIndex: 0, start: 0, end: 7 },
      { segmentIndex: 0, start: 12, end: 19 },
      { segmentIndex: 2, start: 0, end: 7 },
    ]);
  });
  it("treats regex characters literally", () => {
    expect(findMatches(["cost (est.) $5?"], "(est.)")).toEqual([{ segmentIndex: 0, start: 5, end: 11 }]);
  });
  it("ignores blank queries", () => expect(findMatches(["abc"], "  ")).toEqual([]));
});

describe("splitByRanges", () => {
  it("splits text into highlighted and plain parts", () => {
    expect(splitByRanges("hello world", [{ start: 6, end: 11 }])).toEqual([
      { text: "hello ", match: false },
      { text: "world", match: true },
    ]);
  });
});
