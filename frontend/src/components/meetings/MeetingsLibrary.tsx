"use client";

import clsx from "clsx";
import { ArrowUpDown, CloudUpload, SearchX, Share2, TriangleAlert, Video, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AskFredPanel } from "@/components/askfred/AskFredPanel";
import { CaptureButton } from "@/components/layout/CaptureButton";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMeetingFilters } from "@/hooks/useMeetingFilters";
import { hasActiveFilters, serializeFilters, toApiParams, type LibraryFilters } from "@/lib/filters";
import { useMeetings, useParticipants } from "@/lib/queries";
import type { MeetingListItem } from "@/lib/types";

import { ChannelsPanel, type Channel } from "./ChannelsPanel";
import { DeleteMeetingDialog } from "./DeleteMeetingDialog";
import { EditMeetingDialog } from "./EditMeetingDialog";
import { DATE_LABELS, FiltersPopover, SOURCE_LABELS } from "./FiltersPopover";
import { MeetingList } from "./MeetingList";

const PAGE_SIZE = 20;

export function LibrarySkeleton() {
  return (
    <div className="divide-y divide-line" aria-busy="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <Skeleton className="size-9 rounded-lg" />
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

/** The Fireflies Meetings page: channels on the left, the meeting list, and AskFred on the right. */
export function MeetingsLibrary() {
  const { filters, setFilters, reset } = useMeetingFilters();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [now] = useState(() => new Date());
  const [ownership, setOwnership] = useState<"hosted" | "shared">("hosted");

  // "Load more" grows the page size; it resets whenever the filters change.
  const filterKey = serializeFilters(filters).toString();
  const [paging, setPaging] = useState({ key: filterKey, pages: 1 });
  const pages = paging.key === filterKey ? paging.pages : 1;

  const params = useMemo(() => ({ ...toApiParams(filters, now), limit: PAGE_SIZE * pages }), [filters, now, pages]);
  const { data, isPending, isError, refetch, isFetching } = useMeetings(params);

  const isUploads = filters.view === "uploads";
  const channel: Channel = isUploads ? "uploads" : searchParams.get("scope") === "all" ? "all" : "mine";
  const filtered = hasActiveFilters(filters);
  const activeCount =
    (filters.participantIds.length ? 1 : 0) +
    (filters.keywords.length ? 1 : 0) +
    (filters.preset !== "any" ? 1 : 0) +
    (filters.sources.length ? 1 : 0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<MeetingListItem | null>(null);

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
        <ChannelsPanel active={channel} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-surface" aria-label="Meetings">
        <div className="shrink-0 border-b border-line px-4 py-3">
          {/* Below lg the channels column is hidden, so its views become pills here. */}
          <div className="mb-3 flex gap-1.5 lg:hidden">
            {(
              [
                ["mine", "My Meetings", "/meetings"],
                ["uploads", "Uploads", "/meetings?view=uploads"],
              ] as const
            ).map(([value, label, href]) => (
              <button
                key={value}
                type="button"
                onClick={() => router.push(href)}
                aria-pressed={channel === value}
                className={clsx(
                  "rounded-full px-3 py-1 text-sm",
                  channel === value ? "bg-brand-50 font-medium text-brand-700" : "bg-raised text-gray-600",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-gray-200" role="group" aria-label="Ownership">
              {(
                [
                  ["hosted", "Hosted by me"],
                  ["shared", "Shared with me"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={ownership === value}
                  onClick={() => setOwnership(value)}
                  className={clsx(
                    "h-9 px-3 text-sm first:rounded-l-lg last:rounded-r-lg",
                    ownership === value ? "bg-raised font-medium text-gray-900" : "text-gray-600 hover:bg-raised",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <FiltersPopover filters={filters} onChange={setFilters} onClearAll={reset} activeCount={activeCount} />
            <button
              type="button"
              onClick={() => setFilters({ sort: filters.sort === "newest" ? "oldest" : "newest" })}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-700 hover:bg-raised"
              aria-label={`Sorted ${filters.sort === "newest" ? "newest first" : "oldest first"}; click to reverse`}
            >
              <ArrowUpDown className="size-4" />
              {filters.sort === "newest" ? "Newest" : "Oldest"}
            </button>
            <p className="ml-auto text-sm text-gray-500">
              {data ? `${data.total} meeting${data.total === 1 ? "" : "s"}` : null}
            </p>
          </div>

          <ActiveFilterChips filters={filters} onChange={setFilters} onReset={reset} />
        </div>

        <div className={clsx("min-h-0 flex-1 overflow-y-auto", isFetching && !isPending && "opacity-70 transition-opacity")}>
          {ownership === "shared" ? (
            <EmptyState
              icon={Share2}
              title="Nothing shared with you yet"
              description="Meetings teammates share with you will show up here. Sharing is coming soon."
            />
          ) : isPending ? (
            <LibrarySkeleton />
          ) : isError ? (
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
          ) : data.items.length === 0 ? (
            filtered ? (
              <EmptyState
                icon={SearchX}
                title="No meetings match your filters"
                description="Try a different search term, participant or date range."
                action={<Button onClick={reset}>Clear filters</Button>}
              />
            ) : (
              <EmptyState
                icon={isUploads ? CloudUpload : Video}
                title={isUploads ? "No uploads yet" : "Looks like you haven't added a meeting yet"}
                description="Upload a .txt, .vtt or .json transcript, or paste one, to create your first meeting."
                action={<CaptureButton />}
              />
            )
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
                <div className="flex justify-center py-6">
                  <Button onClick={() => setPaging({ key: filterKey, pages: pages + 1 })} disabled={isFetching}>
                    {isFetching ? "Loading…" : `Load more (${data.total - data.items.length} more)`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <aside className="hidden w-[360px] shrink-0 border-l border-line bg-surface xl:block">
        <AskFredPanel
          greeting="Get ready for your meeting"
          contextLabel="My Meetings"
          suggestions={[
            { label: "My action items", onSelect: () => router.push("/tasks") },
            { label: "Key initiatives this week" },
          ]}
        />
      </aside>

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

/** One removable chip per active filter, so it's always visible what the list is narrowed by. */
function ActiveFilterChips({
  filters,
  onChange,
  onReset,
}: {
  filters: LibraryFilters;
  onChange: (patch: Partial<LibraryFilters>) => void;
  onReset: () => void;
}) {
  const { data: people = [] } = useParticipants();
  const chips: { key: string; label: string; remove: () => void }[] = [];
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, remove: () => onChange({ q: "" }) });
  for (const id of filters.participantIds) {
    const name = people.find((person) => person.id === id)?.name ?? "Participant";
    chips.push({
      key: `p${id}`,
      label: name,
      remove: () => onChange({ participantIds: filters.participantIds.filter((value) => value !== id) }),
    });
  }
  for (const keyword of filters.keywords) {
    chips.push({
      key: `k:${keyword}`,
      label: `# ${keyword}`,
      remove: () => onChange({ keywords: filters.keywords.filter((value) => value !== keyword) }),
    });
  }
  if (filters.preset !== "any") {
    const label =
      filters.preset === "custom" ? `${filters.from ?? "…"} – ${filters.to ?? "…"}` : DATE_LABELS[filters.preset];
    chips.push({ key: "date", label, remove: () => onChange({ preset: "any", from: null, to: null }) });
  }
  for (const source of filters.sources) {
    chips.push({
      key: source,
      label: SOURCE_LABELS[source],
      remove: () => onChange({ sources: filters.sources.filter((value) => value !== source) }),
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span key={chip.key} className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-0.5 pl-2 pr-1 text-xs text-brand-700">
          {chip.label}
          <button type="button" onClick={chip.remove} aria-label={`Remove filter ${chip.label}`} className="rounded p-0.5 hover:bg-brand-100">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <button type="button" onClick={onReset} className="text-xs text-gray-500 hover:text-gray-800 hover:underline">
        Clear all
      </button>
    </div>
  );
}
