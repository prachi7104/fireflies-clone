"use client";

import clsx from "clsx";
import { Bot, SearchX, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AskFredPanel } from "@/components/askfred/AskFredPanel";
import { DeleteMeetingDialog } from "@/components/meetings/DeleteMeetingDialog";
import { EditMeetingDialog } from "@/components/meetings/EditMeetingDialog";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { usePlaybackClock } from "@/hooks/usePlaybackClock";
import { ApiError } from "@/lib/api";
import { useMe, useMeeting } from "@/lib/queries";
import { smartFilterIndexes, speakerStats, type SmartFilter } from "@/lib/smartSearch";
import { findActiveIndex } from "@/lib/sync";
import type { MeetingDetail } from "@/lib/types";

import { ActionItemsList } from "./ActionItemsList";
import { MeetingTopBar } from "./MeetingTopBar";
import { NotesPanel } from "./NotesPanel";
import { PlayerBar } from "./PlayerBar";
import { SmartSearchPanel } from "./SmartSearchPanel";
import { TranscriptPanel, type TranscriptFilter } from "./TranscriptPanel";

const FILTER_NOUNS: Record<SmartFilter, [string, string]> = {
  questions: ["question", "questions"],
  tasks: ["task", "tasks"],
  metrics: ["metric", "metrics"],
  dates: ["date or time", "dates and times"],
};

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
              <Link href="/meetings" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
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

type MobileTab = "notes" | "transcript" | "insights";

const RIGHT_TABS = [
  ["askfred", "AskFred"],
  ["transcript", "Transcript"],
] as const;

/**
 * The Fireflies meeting layout: Smart Search | Notes | AskFred/Transcript, with a full-width player.
 * Below 1024px the three areas become tabs so the page works on a phone.
 */
function MeetingWorkspace({ meeting, initialMs }: { meeting: MeetingDetail; initialMs: number }) {
  const router = useRouter();
  const { data: me } = useMe();
  const clock = usePlaybackClock(meeting.duration_ms, initialMs);
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const [rightTab, setRightTab] = useState<"askfred" | "transcript">("transcript");
  const [mobileTab, setMobileTab] = useState<MobileTab>("transcript");
  const [query, setQuery] = useState("");
  const [smartFilter, setSmartFilter] = useState<SmartFilter | null>(null);
  const { seek } = clock;
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isWide = useMediaQuery("(min-width: 1280px)");

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

  // Smart Search: counts for every filter, plus the lines of the one that's selected.
  const taskSegmentIds = useMemo(
    () => new Set(meeting.action_items.flatMap((item) => (item.segment_id === null ? [] : [item.segment_id]))),
    [meeting.action_items],
  );
  const counts = useMemo(() => {
    const count = (filter: SmartFilter) => smartFilterIndexes(filter, meeting.segments, taskSegmentIds).length;
    return { questions: count("questions"), tasks: count("tasks"), metrics: count("metrics"), dates: count("dates") };
  }, [meeting.segments, taskSegmentIds]);
  const speakers = useMemo(() => speakerStats(meeting.segments, meeting.participants), [meeting.segments, meeting.participants]);

  const clearFilter = useCallback(() => setSmartFilter(null), []);
  const transcriptFilter = useMemo<TranscriptFilter | null>(() => {
    if (!smartFilter) return null;
    const indexes = smartFilterIndexes(smartFilter, meeting.segments, taskSegmentIds);
    const [one, many] = FILTER_NOUNS[smartFilter];
    return { indexes, label: `${indexes.length} ${indexes.length === 1 ? one : many}`, onClear: clearFilter };
  }, [smartFilter, meeting.segments, taskSegmentIds, clearFilter]);

  // Choosing a filter or a topic shows the transcript, wherever it is on this screen size.
  const showTranscript = useCallback(() => {
    setRightTab("transcript");
    setMobileTab("transcript");
  }, []);

  const lineStarts = useMemo(() => meeting.segments.map((segment) => segment.start_ms), [meeting.segments]);
  const chapterStarts = useMemo(() => meeting.chapters.map((chapter) => chapter.start_ms), [meeting.chapters]);
  const activeIndex = findActiveIndex(lineStarts, clock.currentMs);
  const activeChapterIndex = findActiveIndex(chapterStarts, clock.currentMs);

  useEffect(() => {
    document.title = `${meeting.title} - Fireflies.ai`;
  }, [meeting.title]);

  const smartSearch = (
    <SmartSearchPanel
      counts={counts}
      active={smartFilter}
      onFilter={(filter) => {
        setSmartFilter(filter);
        if (filter) showTranscript();
      }}
      speakers={speakers}
      keywords={meeting.keywords}
      onKeyword={(keyword) => {
        setQuery(keyword);
        showTranscript();
      }}
    />
  );

  const transcript = (
    <TranscriptPanel
      segments={meeting.segments}
      participants={meeting.participants}
      activeIndex={activeIndex}
      onSeek={seek}
      query={query}
      onQueryChange={setQuery}
      filter={transcriptFilter}
    />
  );

  const notes = (
    <NotesPanel
      meeting={meeting}
      ownerName={me?.name ?? ""}
      activeChapterIndex={activeChapterIndex}
      onSeek={seek}
      actionItems={actionItems}
    />
  );

  const askFred = (
    <AskFredPanel
      greeting="Ask anything about this meeting"
      contextLabel={meeting.title}
      suggestions={meeting.keywords.slice(0, 3).map((keyword) => ({ label: `What was decided about ${keyword}?` }))}
    />
  );

  return (
    <div className="flex h-full flex-col bg-surface">
      <MeetingTopBar meeting={meeting} onEdit={() => setDialog("edit")} onDelete={() => setDialog("delete")} />
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

      {isDesktop ? (
        /* Desktop: three columns (Smart Search only from 1280px). */
        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,400px)] xl:grid-cols-[300px_minmax(0,1fr)_minmax(0,420px)]">
          {isWide ? <aside className="min-h-0 border-r border-line">{smartSearch}</aside> : null}
          <div className="min-h-0">{notes}</div>
          <aside className="flex min-h-0 flex-col border-l border-line">
            <div role="tablist" aria-label="Side panel" className="flex h-12 shrink-0 items-end gap-5 border-b border-line px-4">
              {RIGHT_TABS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={rightTab === value}
                  onClick={() => setRightTab(value)}
                  className={clsx(
                    "flex items-center gap-1.5 border-b-2 pb-2.5 font-display text-sm transition-colors",
                    rightTab === value
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-gray-500 hover:text-gray-800",
                  )}
                >
                  {value === "askfred" ? <Bot className="size-4" /> : null}
                  {label}
                </button>
              ))}
            </div>
            <div className="min-h-0 flex-1">{rightTab === "transcript" ? transcript : askFred}</div>
          </aside>
        </div>
      ) : (
        /* Tablet and phone: one area at a time. */
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 justify-center border-b border-line py-2">
            <Tabs
              label="Meeting sections"
              value={mobileTab}
              onValueChange={setMobileTab}
              items={[
                { value: "notes", label: "Notes" },
                { value: "transcript", label: "Transcript" },
                { value: "insights", label: "Insights" },
              ]}
            />
          </div>
          <div className="min-h-0 flex-1">
            {mobileTab === "notes" ? notes : mobileTab === "transcript" ? transcript : smartSearch}
          </div>
        </div>
      )}

      <PlayerBar clock={clock} durationMs={meeting.duration_ms} chapters={meeting.chapters} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex h-full flex-col bg-surface" aria-busy="true">
      <div className="flex h-14 items-center border-b border-line px-4">
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_400px] xl:grid-cols-[300px_1fr_420px]">
        <div className="hidden space-y-3 xl:block">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
        <div className="hidden space-y-3 lg:block">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
