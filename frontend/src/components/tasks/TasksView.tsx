"use client";

import clsx from "clsx";
import { ListChecks, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ActionItemRow } from "@/components/meeting-detail/ActionItemRow";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { formatShortDate } from "@/lib/format";
import { useDeleteTask, useMeeting, useTasks, useUpdateTask } from "@/lib/queries";
import type { TaskItem, TaskListParams } from "@/lib/types";

import { NewTaskDialog } from "./NewTaskDialog";

const STATUS_LABELS: Record<TaskListParams["status"], string> = { open: "Open", done: "Completed", all: "All" };

/** Group tasks under their meeting, keeping the API's order (open first, newest meeting first). */
function byMeeting(items: TaskItem[]) {
  const groups = new Map<number, { title: string; startedAt: string; items: TaskItem[] }>();
  for (const item of items) {
    const group = groups.get(item.meeting_id) ?? { title: item.meeting_title, startedAt: item.meeting_started_at, items: [] };
    group.items.push(item);
    groups.set(item.meeting_id, group);
  }
  return [...groups.entries()];
}

/** Fireflies' Tasks page: every action item from every meeting, in one place. */
export function TasksView() {
  const [params, setParams] = useState<TaskListParams>({ scope: "mine", status: "open" });
  const [creating, setCreating] = useState(false);
  const { data, isPending, isError, refetch } = useTasks(params);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Whose tasks"
          value={params.scope}
          onValueChange={(scope) => setParams((current) => ({ ...current, scope }))}
          items={[
            { value: "mine", label: "My Tasks" },
            { value: "all", label: "All Tasks" },
          ]}
        />
        <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-4" /> New
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-raised px-4 py-3 text-sm text-gray-600">
        <span>Automatically send all your tasks to your work apps.</span>
        <button type="button" onClick={() => toast.info("Task integrations are coming soon.")} className="font-medium text-brand-600 hover:underline">
          Connect
        </button>
      </div>

      <div className="mt-4 flex gap-1.5" role="group" aria-label="Status">
        {(Object.keys(STATUS_LABELS) as TaskListParams["status"][]).map((status) => (
          <button
            key={status}
            type="button"
            aria-pressed={params.status === status}
            onClick={() => setParams((current) => ({ ...current, status }))}
            className={clsx(
              "rounded-full px-3 py-1 text-sm",
              params.status === status ? "bg-brand-50 font-medium text-brand-700" : "bg-raised text-gray-600 hover:text-gray-900",
            )}
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={TriangleAlert}
            title="Couldn't load tasks"
            description="The server didn't respond. Check your connection and try again."
            action={
              <Button variant="primary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="All your meeting tasks in one place"
            description={
              params.status === "done"
                ? "Nothing completed yet."
                : "Manage, assign and update all your meeting tasks here."
            }
            action={
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Plus className="size-4" /> New
              </Button>
            }
          />
        ) : (
          <div className="space-y-6">
            {byMeeting(data.items).map(([meetingId, group]) => (
              <section key={meetingId} aria-label={group.title}>
                <h2 className="mb-1 flex items-baseline gap-2">
                  <Link href={`/meetings/${meetingId}`} className="text-[15px] font-medium text-gray-900 hover:text-brand-700">
                    {group.title}
                  </Link>
                  <span className="text-xs text-gray-500">{formatShortDate(group.startedAt)}</span>
                </h2>
                <MeetingTasks meetingId={meetingId} items={group.items} />
              </section>
            ))}
          </div>
        )}
      </div>

      <NewTaskDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

/**
 * One meeting's tasks, edited with the same row component as the meeting page: rename, reassign,
 * complete and delete. Assignees come from that meeting's participants (the API allows no one else).
 */
function MeetingTasks({ meetingId, items }: { meetingId: number; items: TaskItem[] }) {
  const router = useRouter();
  const { data: meeting } = useMeeting(meetingId);
  const update = useUpdateTask();
  const remove = useDeleteTask();

  return (
    <ul className="divide-y divide-line rounded-xl border border-line bg-surface px-2 py-1">
      {items.map((item) => (
        <ActionItemRow
          key={item.id}
          item={item}
          participants={meeting?.participants ?? []}
          onToggle={() => update.mutate({ id: item.id, input: { is_done: !item.is_done } })}
          onRename={(text) => update.mutate({ id: item.id, input: { text } })}
          onAssign={(assigneeId) => update.mutate({ id: item.id, input: { assignee_id: assigneeId } })}
          onDelete={() =>
            remove.mutate({ id: item.id, meetingId }, { onSuccess: () => toast.success("Task deleted") })
          }
          // "(12:34)" opens the meeting at the moment the task was mentioned.
          onSeek={(ms) => router.push(`/meetings/${meetingId}?t=${Math.floor(ms / 1000)}`)}
        />
      ))}
    </ul>
  );
}
