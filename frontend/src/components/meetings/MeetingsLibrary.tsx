"use client";

import { CloudUpload, SearchX, TriangleAlert, Video } from "lucide-react";
import { useMemo, useState } from "react";

import { CaptureButton } from "@/components/layout/CaptureButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMeetingFilters } from "@/hooks/useMeetingFilters";
import { hasActiveFilters, serializeFilters, toApiParams } from "@/lib/filters";
import { useMeetings } from "@/lib/queries";
import type { MeetingListItem } from "@/lib/types";

import { DeleteMeetingDialog } from "./DeleteMeetingDialog";
import { EditMeetingDialog } from "./EditMeetingDialog";
import { MeetingFilters } from "./MeetingFilters";
import { MeetingList } from "./MeetingList";

const PAGE_SIZE = 20;

export function LibrarySkeleton() {
  return (
    <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-surface" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function MeetingsLibrary() {
  const { filters, setFilters, reset } = useMeetingFilters();
  const [now] = useState(() => new Date());

  // "Load more" grows the page size; it resets whenever the filters change.
  const filterKey = serializeFilters(filters).toString();
  const [paging, setPaging] = useState({ key: filterKey, pages: 1 });
  const pages = paging.key === filterKey ? paging.pages : 1;

  const params = useMemo(() => ({ ...toApiParams(filters, now), limit: PAGE_SIZE * pages }), [filters, now, pages]);
  const { data, isPending, isError, refetch, isFetching } = useMeetings(params);

  const isUploads = filters.view === "uploads";
  const filtered = hasActiveFilters(filters);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<MeetingListItem | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-gray-900">{isUploads ? "Uploads" : "Meetings"}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filters.q ? (
              <>
                Results for <span className="font-medium text-gray-800">&ldquo;{filters.q}&rdquo;</span>
                {data ? ` · ${data.total} found` : null}
              </>
            ) : isUploads ? (
              "Transcripts you uploaded or pasted."
            ) : data ? (
              `${data.total} meeting${data.total === 1 ? "" : "s"} in your workspace`
            ) : (
              "Your meeting notes and transcripts"
            )}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <MeetingFilters filters={filters} onChange={setFilters} onReset={reset} />
      </div>

      <div className={isFetching && !isPending ? "opacity-70 transition-opacity" : undefined}>
        {isPending ? (
          <LibrarySkeleton />
        ) : isError ? (
          <div className="rounded-xl border border-gray-200 bg-surface">
            <EmptyState
              icon={TriangleAlert}
              title="Couldn't load meetings"
              description="The server didn't respond. Check your connection and try again."
              action={
                <Button variant="primary" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : data.items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-surface">
            {filtered ? (
              <EmptyState
                icon={SearchX}
                title="No meetings match your filters"
                description="Try a different search term, participant or date range."
                action={<Button onClick={reset}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                icon={isUploads ? CloudUpload : Video}
                title={isUploads ? "No uploads yet" : "No meetings yet"}
                description="Upload a .txt, .vtt or .json transcript, or paste one, to create your first meeting."
                action={<CaptureButton />}
              />
            )}
          </div>
        ) : (
          <>
            <MeetingList
              meetings={data.items}
              query={filters.q}
              now={now}
              onEdit={(meeting) => setEditingId(meeting.id)}
              onDelete={setDeleting}
            />
            {data.items.length < data.total ? (
              <div className="mt-6 flex justify-center">
                <Button onClick={() => setPaging({ key: filterKey, pages: pages + 1 })} disabled={isFetching}>
                  {isFetching ? "Loading…" : `Load more (${data.total - data.items.length} more)`}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <EditMeetingDialog
        meetingId={editingId}
        open={editingId !== null}
        onOpenChange={(open) => !open && setEditingId(null)}
      />
      <DeleteMeetingDialog
        meeting={deleting}
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  );
}
