"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { errorMessage } from "@/lib/api";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/format";
import { useMeeting, useUpdateMeeting } from "@/lib/queries";
import type { MeetingDetail, MeetingUpdateInput } from "@/lib/types";

import { MeetingForm, type MeetingFormValue } from "./MeetingForm";

export function EditMeetingDialog({
  meetingId,
  open,
  onOpenChange,
}: {
  meetingId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Edit meeting details">
      {open && meetingId !== null ? <EditLoader meetingId={meetingId} onDone={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

// The list only has a summary of each meeting; this loads the full record (who speaks, etc.).
function EditLoader({ meetingId, onDone }: { meetingId: number; onDone: () => void }) {
  const { data } = useMeeting(meetingId);
  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  return <EditForm meeting={data} onDone={onDone} />;
}

function EditForm({ meeting, onDone }: { meeting: MeetingDetail; onDone: () => void }) {
  const initial: MeetingFormValue = {
    title: meeting.title,
    startedAtLocal: toLocalInputValue(meeting.started_at),
    participants: meeting.participants.map((person) => person.name),
  };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateMeeting(meeting.id);
  const speakers = meeting.participants.filter((person) => person.is_speaker).map((person) => person.name);

  function save() {
    setError(null);
    if (!form.title.trim()) return setError("The title can't be empty.");
    if (!form.startedAtLocal) return setError("Choose the meeting date and time.");

    // Send only what changed.
    const changes: MeetingUpdateInput = {};
    if (form.title.trim() !== initial.title) changes.title = form.title.trim();
    if (form.startedAtLocal !== initial.startedAtLocal) changes.started_at = fromLocalInputValue(form.startedAtLocal);
    if (form.participants.join("\n") !== initial.participants.join("\n")) changes.participants = form.participants;
    if (Object.keys(changes).length === 0) return onDone();

    update.mutate(changes, {
      onSuccess: () => {
        toast.success("Meeting updated");
        onDone();
      },
      onError: (err) => setError(errorMessage(err)),
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="space-y-5"
    >
      <MeetingForm mode="edit" value={form} onChange={setForm} lockedParticipants={speakers} />
      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
        <Button onClick={onDone} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
