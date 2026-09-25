import { describe, expect, it } from "vitest";

import { parseFilters, serializeFilters, toApiParams } from "./filters";

const now = new Date(2026, 8, 25, 15, 0, 0); // local time, Sep 25 2026 15:00

describe("filters", () => {
  it("round-trips through the URL and omits defaults", () => {
    const f = parseFilters(new URLSearchParams("q=pricing&participant=3&participant=5&sort=oldest"));
    expect(f).toMatchObject({ q: "pricing", participantIds: [3, 5], sort: "oldest", preset: "any", view: "all" });
    expect(serializeFilters(f).toString()).toBe("q=pricing&participant=3&participant=5&sort=oldest");
  });

  it("ignores junk values in the URL", () => {
    const f = parseFilters(new URLSearchParams("participant=abc&participant=-2&preset=forever&sort=sideways&from=yesterday"));
    expect(f).toMatchObject({ participantIds: [], preset: "any", sort: "newest", from: null });
  });

  it("turns the 7-day preset into a local-midnight lower bound", () => {
    const p = toApiParams(parseFilters(new URLSearchParams("preset=7d")), now);
    expect(new Date(p.date_from!).getTime()).toBe(new Date(2026, 8, 19, 0, 0, 0).getTime());
    expect(p.date_to).toBeUndefined();
  });

  it("makes custom ranges inclusive of the end day", () => {
    const p = toApiParams(parseFilters(new URLSearchParams("preset=custom&from=2026-09-10&to=2026-09-12")), now);
    expect(new Date(p.date_from!).getTime()).toBe(new Date(2026, 8, 10).getTime());
    expect(new Date(p.date_to!).getTime()).toBe(new Date(2026, 8, 13).getTime());
  });

  it("maps the uploads view to imported sources", () => {
    expect(toApiParams(parseFilters(new URLSearchParams("view=uploads")), now).source).toEqual(["upload", "paste"]);
  });
});
