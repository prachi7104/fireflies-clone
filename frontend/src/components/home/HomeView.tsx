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
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[280px] bg-[linear-gradient(rgba(255,255,255,0),#ffffff),linear-gradient(128.58deg,rgba(17,112,207,0.3)_20.58%,rgba(254,172,170,0.45)_62.69%,rgba(254,209,170,0.6)_96.89%,rgba(255,255,255,0)_113.84%)] dark:bg-[linear-gradient(rgba(19,19,20,0),#131314),linear-gradient(128.58deg,rgba(17,112,207,0.12)_20.58%,rgba(254,172,170,0.08)_62.69%,rgba(254,209,170,0.1)_96.89%,rgba(19,19,20,0)_113.84%)]" />
    <div className="relative mx-auto w-full max-w-[868px] px-4 py-6 sm:px-6 sm:py-16">
      <section className="flex flex-col gap-6 rounded-[20px] border border-transparent p-6 [background:linear-gradient(#fef6ee,#fef6ee)_padding-box,linear-gradient(#f7b27a,transparent)_border-box] sm:min-h-[211px] sm:flex-row sm:items-center sm:justify-between sm:px-14 lg:px-28 dark:[background:linear-gradient(#3a1f0f,#3a1f0f)_padding-box,linear-gradient(#5c3d26,#3a1f0f)_border-box]">
        <div>
          <h1 className="text-xl font-medium text-gray-900 dark:text-[#d8cdc7]">
            Welcome Aboard{firstName ? `, ${firstName}` : ""}!
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500 dark:text-[#c3a898]">
            Fireflies is now ready to automate your meetings and streamline your workflows.
          </p>
        </div>
        <Link
          href={newest ? `/meetings/${newest.id}` : "/meetings"}
          className="group relative flex h-[136px] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl border-[3px] border-[#fcc7a5] bg-gradient-to-b from-[#0a0138] via-[#2b1a8a] to-[#040022] sm:w-[202px]"
          aria-label={newest ? `Open ${newest.title}` : "Open meetings"}
        >
          <span className="absolute left-3 top-2 max-w-[85%] truncate text-[11px] font-medium text-white/80">
            {newest?.title ?? "Your meetings"}
          </span>
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-400/70 transition-transform group-hover:scale-110">
            <Play className="ml-0.5 size-4 text-white" fill="currentColor" />
          </span>
        </Link>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-gray-900">Quick Start</h2>
        <p className="mt-1 text-sm text-gray-500">Capture your first meeting or upload a transcript to see Fireflies in action.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <QuickStart
            icon={<CalendarPlus className="size-5 text-[#faa7e0] dark:text-[#853351]" />}
            tint="bg-[#fdf2fa] dark:bg-[#3a1423]"
            label="Schedule Meeting"
            onClick={() => toast.info("Calendar scheduling is coming soon.")}
          />
          <QuickStart
            icon={<Upload className="size-5 text-[#5fe9d0] dark:text-[#206156]" />}
            tint="bg-[#f0fdf9] dark:bg-[#0c2622]"
            label="Upload File"
            onClick={() => openCreate("upload")}
          />
          <QuickStart
            icon={<Plus className="size-5 text-[#bdb4fe] dark:text-[#3f387c]" />}
            tint="bg-[#f4f3ff] dark:bg-[#17152e]"
            label="Paste Transcript"
            onClick={() => openCreate("paste")}
          />
        </div>
      </section>

      <section className="mt-10">
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
    </div>
  );
}

function QuickStart({ icon, tint, label, onClick }: { icon: ReactNode; tint: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-4 text-left text-sm text-gray-700 shadow-[0_2px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-[#292929] dark:hover:border-[#3a3a3d] ${tint}`}
    >
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-gray-700" />
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
