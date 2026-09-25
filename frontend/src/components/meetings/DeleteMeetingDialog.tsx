"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useDeleteMeeting } from "@/lib/queries";

export function DeleteMeetingDialog({
  meeting,
  open,
  onOpenChange,
  onDeleted,
}: {
  meeting: { id: number; title: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const remove = useDeleteMeeting();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete this meeting?"
      description="The transcript, notes and action items will be permanently deleted."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={remove.isPending || !meeting}
            onClick={() =>
              meeting &&
              remove.mutate(meeting.id, {
                onSuccess: () => {
                  toast.success("Meeting deleted", { description: meeting.title });
                  onOpenChange(false);
                  onDeleted?.();
                },
              })
            }
          >
            {remove.isPending ? "Deleting…" : "Delete meeting"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        <span className="font-semibold">{meeting?.title}</span> will be removed from your workspace. This can&apos;t be
        undone.
      </p>
    </Dialog>
  );
}
