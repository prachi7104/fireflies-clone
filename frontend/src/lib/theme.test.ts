import { describe, expect, it } from "vitest";

import { parsePreference, resolveTheme } from "./theme";

describe("theme", () => {
  it("defaults unknown or missing values to dark", () => {
    expect(parsePreference(null)).toBe("dark");
    expect(parsePreference("purple")).toBe("dark");
    expect(parsePreference("light")).toBe("light");
    expect(parsePreference("dark")).toBe("dark");
    expect(parsePreference("system")).toBe("system");
  });

  it("resolves system from the OS setting and keeps explicit choices", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
