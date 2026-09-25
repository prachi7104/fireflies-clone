import { describe, expect, it } from "vitest";

import { groupByAssignee } from "./actionItems";
import type { ActionItem } from "./types";

const item = (id: number, assignee_id: number | null, is_done = false): ActionItem => ({
  id,
  meeting_id: 1,
  text: `t${id}`,
  assignee_id,
  segment_id: null,
  start_ms: null,
  is_done,
  completed_at: is_done ? "2026-01-01T00:00:00Z" : null,
  source: "ai",
  created_at: "2026-01-01T00:00:00Z",
});
const people = [
  { id: 7, name: "Priya Nair" },
  { id: 8, name: "Marcus Chen" },
];

describe("groupByAssignee", () => {
  it("groups by person in order of first appearance, unassigned last, open before done", () => {
    const groups = groupByAssignee([item(1, 8), item(2, null), item(3, 7, true), item(4, 7)], people);
    expect(groups.map((group) => group.name)).toEqual(["Marcus Chen", "Priya Nair", "Unassigned"]);
    expect(groups[1].items.map((i) => i.id)).toEqual([4, 3]);
  });

  it("returns no groups for no items", () => {
    expect(groupByAssignee([], people)).toEqual([]);
  });
});
