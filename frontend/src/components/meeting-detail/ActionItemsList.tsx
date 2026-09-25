"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useCreateActionItem, useDeleteActionItem, useUpdateActionItem } from "@/lib/queries";
import type { ActionItem, MeetingParticipant } from "@/lib/types";

import { ActionItemRow } from "./ActionItemRow";

export function ActionItemsList({
  meetingId,
  items,
  participants,
  onSeek,
}: {
  meetingId: number;
  items: ActionItem[];
  participants: MeetingParticipant[];
  onSeek: (ms: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const create = useCreateActionItem(meetingId);
  const update = useUpdateActionItem(meetingId);
  const remove = useDeleteActionItem(meetingId);

  // Open tasks first; within each group, keep the order they came up in the meeting.
  const ordered = [...items].sort((a, b) => Number(a.is_done) - Number(b.is_done) || a.id - b.id);
  const openCount = items.filter((item) => !item.is_done).length;

  function add() {
    const text = draft.trim();
    if (!text) return;
    create.mutate({ text }, { onSuccess: () => setDraft("") });
  }

  return (
    <div>
      {items.length > 0 ? (
        <p className="mb-2 text-xs text-gray-500">
          {openCount} open · {items.length - openCount} done
        </p>
      ) : (
        <p className="mb-2 text-sm text-gray-500">No action items yet.</p>
      )}
      <ul className="-mx-2 space-y-0.5">
        {ordered.map((item) => (
          <ActionItemRow
            key={item.id}
            item={item}
            participants={participants}
            onToggle={() => update.mutate({ id: item.id, input: { is_done: !item.is_done } })}
            onRename={(text) => update.mutate({ id: item.id, input: { text } })}
            onAssign={(assigneeId) => update.mutate({ id: item.id, input: { assignee_id: assigneeId } })}
            onDelete={() => remove.mutate(item.id, { onSuccess: () => toast.success("Action item deleted") })}
            onSeek={onSeek}
          />
        ))}
      </ul>
      <form
        className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 focus-within:border-brand-300"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <Plus className="size-4 text-gray-400" />
        <input
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add an action item and press Enter"
          aria-label="New action item"
          disabled={create.isPending}
          className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-gray-400"
        />
      </form>
    </div>
  );
}
