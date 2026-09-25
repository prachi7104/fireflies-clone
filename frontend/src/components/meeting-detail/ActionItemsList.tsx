"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { groupByAssignee } from "@/lib/actionItems";
import { useCreateActionItem, useDeleteActionItem, useUpdateActionItem } from "@/lib/queries";
import type { ActionItem, MeetingParticipant } from "@/lib/types";

import { ActionItemRow } from "./ActionItemRow";

/** Action items grouped under each person's name, as in Fireflies, with add / edit / complete / delete. */
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

  const groups = groupByAssignee(items, participants);
  const openCount = items.filter((item) => !item.is_done).length;

  function add() {
    const text = draft.trim();
    if (!text) return;
    create.mutate({ text }, { onSuccess: () => setDraft("") });
  }

  return (
    <div>
      <p className="mb-3 text-xs text-gray-500">
        {items.length > 0 ? `${openCount} open · ${items.length - openCount} done` : "No action items yet."}
      </p>
      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.assigneeId ?? "none"} aria-label={`Action items for ${group.name}`}>
            <h4 className="mb-1 text-[15px] font-semibold text-gray-900">{group.name}</h4>
            <ul className="-mx-2">
              {group.items.map((item) => (
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
          </section>
        ))}
      </div>
      <form
        className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-2 py-1.5 focus-within:border-brand-300"
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
          className="flex-1 bg-transparent py-1 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
      </form>
    </div>
  );
}
