"use client";

import { CalendarDays, CalendarPlus, ChevronRight, Play, Plus, Settings, Sparkles, Upload, Video } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { useOpenCreateMeeting } from "@/components/meetings/CreateMeetingContext";
import { AvatarStack } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { useHydrated } from "@/hooks/useHydrated";
import { formatDuration, formatMeetingDate } from "@/lib/format";
import { useMe, useMeetingDetails, useMeetings } from "@/lib/queries";
import type { MeetingListItem } from "@/lib/types";

const RECENT_PARAMS = { sort: "newest" as const, limit: 5 };

/** Fireflies' Home: a welcome banner, Quick Start actions and the latest meetings. */
export function HomeView() {
  const { data: me } = useMe();
  const hydrated = useHydrated();
  const openCreate = useOpenCreateMeeting();
  const { data, isPending, isError, refetch } = useMeetings(RECENT_PARAMS);
  const [tab, setTab] = useState<"recent" | "upcoming" | "feed">("recent");
  const newest = data?.items[0];
  const firstName = (hydrated && me?.name.split(" ")[0]) || "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col gap-6 rounded-2xl border border-orange-200/60 bg-gradient-to-br from-[#fff4ed] to-[#fdeff4] p-6 sm:flex-row sm:items-center sm:p-8 dark:border-orange-900/40 dark:from-[#3a1d0e] dark:to-[#2a1420]">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-gray-900">Welcome aboard{firstName ? `, ${firstName}` : ""}!</h1>
          <p className="mt-2 max-w-md text-[15px] leading-6 text-gray-600">
            Your workspace is ready. Open a meeting to see AI notes, action items and a transcript that follows the player.
          </p>
        </div>
        <Link
          href={newest ? `/meetings/${newest.id}` : "/meetings"}
          className="group relative flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#2b1a66] via-brand-600 to-[#120b33] ring-4 ring-orange-100 sm:w-56 dark:ring-orange-950"
          aria-label={newest ? `Open ${newest.title}` : "Open meetings"}
        >
          <span className="absolute left-3 top-2 max-w-[85%] truncate text-xs font-medium text-white/80">
            {newest?.title ?? "Your meetings"}
          </span>
          <span className="flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur transition-transform group-hover:scale-110">
            <Play className="ml-0.5 size-5 text-white" fill="currentColor" />
          </span>
        </Link>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-gray-900">Quick Start</h2>
        <p className="mt-1 text-sm text-gray-500">Add a transcript or capture a meeting to see Fireflies in action.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <QuickStart
            icon={<CalendarPlus className="size-5 text-rose-500" />}
            tint="bg-rose-50/70 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/50"
            label="Schedule Meeting"
            onClick={() => toast.info("Calendar scheduling is coming soon.")}
          />
          <QuickStart
            icon={<Upload className="size-5 text-emerald-600" />}
            tint="bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900/50"
            label="Upload File"
            onClick={() => openCreate("upload")}
          />
          <QuickStart
            icon={<Plus className="size-5 text-brand-500" />}
            tint="bg-brand-25 border-brand-100"
            label="Paste Transcript"
            onClick={() => openCreate("paste")}
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <Tabs
            label="Home lists"
            value={tab}
            onValueChange={setTab}
            items={[
              { value: "recent", label: "Recent" },
              { value: "upcoming", label: "Upcoming" },
              { value: "feed", label: "AI Feed" },
            ]}
          />
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
            <Settings className="size-4" /> Settings
          </Link>
        </div>

        <div className="mt-3">
          {tab === "upcoming" ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming meetings"
              description="Connect a calendar to see what's next. Calendar sync is coming soon."
            />
          ) : isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : isError ? (
            <EmptyState
              icon={Video}
              title="Couldn't load meetings"
              description="The server didn't respond."
              action={
                <button type="button" onClick={() => refetch()} className="text-sm font-medium text-brand-600 hover:underline">
                  Retry
                </button>
              }
            />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={Video}
              title="No meetings yet"
              description="Upload or paste a transcript to create your first meeting."
            />
          ) : tab === "recent" ? (
            <RecentList meetings={data.items} />
          ) : (
            <AiFeed ids={data.items.map((meeting) => meeting.id)} />
          )}
        </div>
      </section>
    </div>
  );
}

function QuickStart({ icon, tint, label, onClick }: { icon: ReactNode; tint: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-4 text-left text-[15px] font-medium text-gray-800 transition-shadow hover:shadow-card focus-visible:outline-2 focus-visible:outline-brand-500 ${tint}`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-gray-400" />
    </button>
  );
}

function RecentList({ meetings }: { meetings: MeetingListItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <Link href={`/meetings/${meeting.id}`} className="flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-raised">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Video className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-gray-900">{meeting.title}</span>
              <span className="block text-sm text-gray-500">
                {formatMeetingDate(meeting.started_at)} · {formatDuration(meeting.duration_ms)}
              </span>
            </span>
            <span className="hidden sm:block">
              <AvatarStack people={meeting.participants} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AiFeed({ ids }: { ids: number[] }) {
  const results = useMeetingDetails(ids);
  return (
    <ul className="space-y-3">
      {results.map((result, index) => (
        <li key={ids[index]} className="rounded-xl border border-line bg-surface p-4">
          {result.data ? (
            <Link href={`/meetings/${result.data.id}`} className="block">
              <span className="flex items-center gap-2 text-[15px] font-medium text-gray-900">
                <Sparkles className="size-4 text-brand-500" /> {result.data.title}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500">{formatMeetingDate(result.data.started_at)}</span>
              <span className="mt-2 line-clamp-3 block text-sm leading-6 text-gray-700">
                {result.data.summary?.overview ?? "No summary for this meeting."}
              </span>
            </Link>
          ) : (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
