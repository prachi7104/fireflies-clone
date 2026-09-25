"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { errorMessage } from "@/lib/api";
import { useCreateTask, useMeeting, useMeetings } from "@/lib/queries";

const MEETING_OPTIONS = { sort: "newest" as const, limit: 100 };
const fieldClass =
  "mt-1.5 h-10 w-full rounded-lg border border-gray-200 bg-surface px-3 text-sm text-gray-900 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100";

/** "+ New" on the Tasks page: pick a meeting, write the task, optionally assign someone from that meeting. */
export function NewTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="New task" description="Tasks belong to a meeting, like Fireflies action items.">
      {/* Mounted only while open, so every opening starts with a clean form. */}
      {open ? <NewTaskForm onDone={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function NewTaskForm({ onDone }: { onDone: () => void }) {
  const { data: meetings } = useMeetings(MEETING_OPTIONS);
  const [meetingId, setMeetingId] = useState<number | null>(null);
  const chosenId = meetingId ?? meetings?.items[0]?.id ?? null;
  const { data: meeting } = useMeeting(chosenId ?? 0, { enabled: chosenId !== null });
  const [text, setText] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = useCreateTask();

  // Only people in the chosen meeting can be assigned (the API enforces the same rule).
  const people = chosenId !== null && meeting?.id === chosenId ? meeting.participants : [];

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (chosenId === null || !text.trim()) return;
        setError(null);
        create.mutate(
          { meetingId: chosenId, input: { text: text.trim(), assignee_id: assigneeId } },
          {
            onSuccess: () => {
              toast.success("Task added");
              onDone();
            },
            onError: (err) => setError(errorMessage(err)),
          },
        );
      }}
    >
      <label className="block text-sm font-medium text-gray-700">
        Meeting
        <select
          value={chosenId ?? ""}
          onChange={(event) => {
            setMeetingId(Number(event.target.value));
            setAssigneeId(null);
          }}
          className={fieldClass}
          required
        >
          {meetings?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Task
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={500}
          required
          autoFocus
          placeholder="e.g. Send the pilot proposal"
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-medium text-gray-700">
        Assignee
        <select
          value={assigneeId ?? ""}
          onChange={(event) => setAssigneeId(event.target.value ? Number(event.target.value) : null)}
          className={fieldClass}
        >
          <option value="">Unassigned</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={create.isPending || chosenId === null || !text.trim()}>
          {create.isPending ? "Adding…" : "Add task"}
        </Button>
      </div>
    </form>
  );
}
