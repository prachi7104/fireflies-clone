"use client";

import { formatDayLabel } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";

import { MeetingRow } from "./MeetingRow";

/** Meetings grouped under day headings ("Today", "Yesterday", "Mon, Sep 22"), in the order given. */
export function MeetingList({
  meetings,
  query,
  now,
  onEdit,
  onDelete,
}: {
  meetings: MeetingListItem[];
  query: string;
  now: Date;
  onEdit?: (meeting: MeetingListItem) => void;
  onDelete?: (meeting: MeetingListItem) => void;
}) {
  const groups: { label: string; items: MeetingListItem[] }[] = [];
  for (const meeting of meetings) {
    const label = formatDayLabel(meeting.started_at, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(meeting);
    else groups.push({ label, items: [meeting] });
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.label} aria-label={group.label}>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.label}</h2>
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
            {group.items.map((meeting) => (
              <MeetingRow key={meeting.id} meeting={meeting} query={query} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
