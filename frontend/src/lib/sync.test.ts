import { describe, expect, it } from "vitest";

import { findActiveIndex } from "./sync";

describe("findActiveIndex", () => {
  const starts = [0, 5000, 12000, 30000];

  it("returns -1 before the first line", () => expect(findActiveIndex([1000, 2000], 500)).toBe(-1));

  it("finds the line being spoken", () => {
    expect(findActiveIndex(starts, 0)).toBe(0);
    expect(findActiveIndex(starts, 4999)).toBe(0);
    expect(findActiveIndex(starts, 5000)).toBe(1);
    expect(findActiveIndex(starts, 29999)).toBe(2);
  });

  it("stays on the last line after it starts", () => expect(findActiveIndex(starts, 999999)).toBe(3));

  it("handles empty transcripts", () => expect(findActiveIndex([], 10)).toBe(-1));
});
