import { describe, expect, it } from "vitest";

import { formatClock, formatDuration } from "./format";

describe("formatClock", () => {
  it("formats seconds, minutes and hours", () => {
    expect(formatClock(5000)).toBe("0:05");
    expect(formatClock(723000)).toBe("12:03");
    expect(formatClock(3723000)).toBe("1:02:03");
    expect(formatClock(-10)).toBe("0:00");
  });
});

describe("formatDuration", () => {
  it("uses sec, min and hr units", () => {
    expect(formatDuration(45000)).toBe("45 sec");
    expect(formatDuration(32 * 60000 + 10000)).toBe("32 min");
    expect(formatDuration(65 * 60000)).toBe("1 hr 5 min");
  });
});
