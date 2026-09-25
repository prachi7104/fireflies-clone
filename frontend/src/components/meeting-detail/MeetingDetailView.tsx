"use client";

import { SearchX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DeleteMeetingDialog } from "@/components/meetings/DeleteMeetingDialog";
import { EditMeetingDialog } from "@/components/meetings/EditMeetingDialog";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePlaybackClock } from "@/hooks/usePlaybackClock";
import { ApiError } from "@/lib/api";
import { useMeeting } from "@/lib/queries";
import { findActiveIndex } from "@/lib/sync";
import type { MeetingDetail } from "@/lib/types";

import { ActionItemsList } from "./ActionItemsList";
import { MeetingHeader } from "./MeetingHeader";
import { NotesPanel } from "./NotesPanel";
import { PlayerBar } from "./PlayerBar";
import { TranscriptPanel } from "./TranscriptPanel";

export function MeetingDetailView({ id, initialMs }: { id: number; initialMs: number }) {
  const { data, isPending, error, refetch } = useMeeting(id);

  if (isPending) return <DetailSkeleton />;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="px-6 py-16">
        {notFound ? (
          <EmptyState
            icon={SearchX}
            title="Meeting not found"
            description="It may have been deleted, or the link is wrong."
            action={
              <Link href="/meetings" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Back to meetings
              </Link>
            }
          />
        ) : (
          <EmptyState
            icon={TriangleAlert}
            title="Couldn't load this meeting"
            description="The server didn't respond. Check your connection and try again."
            action={
              <Button variant="primary" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        )}
      </div>
    );
  }
  return <MeetingWorkspace meeting={data} initialMs={initialMs} />;
}

function MeetingWorkspace({ meeting, initialMs }: { meeting: MeetingDetail; initialMs: number }) {
  const router = useRouter();
  const clock = usePlaybackClock(meeting.duration_ms, initialMs);
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const { seek } = clock;

  // Built once per data change (not per clock tick) so the memoised notes panel stays cheap.
  const actionItems = useMemo(
    () => (
      <ActionItemsList
        meetingId={meeting.id}
        items={meeting.action_items}
        participants={meeting.participants}
        onSeek={seek}
      />
    ),
    [meeting.id, meeting.action_items, meeting.participants, seek],
  );

  const lineStarts = useMemo(() => meeting.segments.map((segment) => segment.start_ms), [meeting.segments]);
  const chapterStarts = useMemo(() => meeting.chapters.map((chapter) => chapter.start_ms), [meeting.chapters]);
  const activeIndex = findActiveIndex(lineStarts, clock.currentMs);
  const activeChapterIndex = findActiveIndex(chapterStarts, clock.currentMs);

  useEffect(() => {
    document.title = `${meeting.title} · Fireflies Clone`;
  }, [meeting.title]);

  return (
    <div className="flex h-full flex-col bg-white">
      <MeetingHeader meeting={meeting} onEdit={() => setDialog("edit")} onDelete={() => setDialog("delete")} />
      <EditMeetingDialog
        meetingId={meeting.id}
        open={dialog === "edit"}
        onOpenChange={(open) => setDialog(open ? "edit" : null)}
      />
      <DeleteMeetingDialog
        meeting={meeting}
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        onDeleted={() => router.push("/meetings")}
      />
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,45%)_minmax(0,55%)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-1">
        <div className="flex min-h-0 flex-col border-b border-gray-200 lg:border-b-0 lg:border-r">
          <NotesPanel
            summary={meeting.summary}
            keywords={meeting.keywords}
            chapters={meeting.chapters}
            activeChapterIndex={activeChapterIndex}
            onSeek={seek}
            actionItems={actionItems}
          />
        </div>
        <TranscriptPanel
          segments={meeting.segments}
          participants={meeting.participants}
          activeIndex={activeIndex}
          onSeek={seek}
        />
      </div>
      <PlayerBar clock={clock} durationMs={meeting.duration_ms} chapters={meeting.chapters} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col bg-white" aria-busy="true">
      <div className="space-y-2 border-b border-gray-200 px-6 py-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-80" />
        <Skeleton className="h-4 w-60" />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[5fr_7fr]">
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
