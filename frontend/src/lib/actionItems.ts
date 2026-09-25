import type { ActionItem } from "./types";

export interface AssigneeGroup {
  assigneeId: number | null;
  name: string;
  items: ActionItem[];
}

/**
 * Fireflies lists action items under each person's name. Groups follow the order people first appear
 * (AI items are stored in transcript order, so lowest id first), unassigned items go last, and within
 * a group open items come before done ones.
 */
export function groupByAssignee(items: ActionItem[], people: { id: number; name: string }[]): AssigneeGroup[] {
  const names = new Map(people.map((person) => [person.id, person.name]));
  const groups = new Map<number | null, AssigneeGroup>();

  for (const item of [...items].sort((a, b) => a.id - b.id)) {
    const key = item.assignee_id !== null && names.has(item.assignee_id) ? item.assignee_id : null;
    let group = groups.get(key);
    if (!group) {
      group = { assigneeId: key, name: key === null ? "Unassigned" : names.get(key)!, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }

  const ordered = [...groups.values()].sort((a, b) => Number(a.assigneeId === null) - Number(b.assigneeId === null));
  for (const group of ordered) group.items.sort((a, b) => Number(a.is_done) - Number(b.is_done) || a.id - b.id);
  return ordered;
}
