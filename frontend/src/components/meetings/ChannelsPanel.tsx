"use client";

import clsx from "clsx";
import { AudioLines, Hash, Plus, Search, Upload, Video, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export type Channel = "mine" | "all" | "uploads";

const CHANNELS: { value: Channel; label: string; href: string; icon: LucideIcon; badge?: string }[] = [
  { value: "mine", label: "My Meetings", href: "/meetings", icon: Hash },
  { value: "all", label: "All Meetings", href: "/meetings?scope=all", icon: Video },
  { value: "uploads", label: "Uploads", href: "/meetings?view=uploads", icon: Upload, badge: "NEW" },
];

const itemClass =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand-500";

/** Left column of the Fireflies Meetings page: meeting views and (placeholder) channels. */
export function ChannelsPanel({ active }: { active: Channel }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search channels"
            aria-label="Search channels"
            className="h-9 w-full rounded-lg border border-gray-200 bg-surface pl-8 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </div>
      <nav aria-label="Meeting views" className="space-y-0.5 border-b border-line px-3 pb-3">
        {CHANNELS.slice(0, 2).map((channel) => (
          <ChannelLink key={channel.value} channel={channel} active={active === channel.value} />
        ))}
        <span className={clsx(itemClass, "cursor-not-allowed text-gray-400")} title="Voice agents are coming soon">
          <AudioLines className="size-4 shrink-0" />
          <span className="truncate">Voice Agent Meetings</span>
          <span className="ml-auto rounded bg-raised px-1.5 text-[10px] font-medium text-gray-500">Soon</span>
        </span>
        <ChannelLink channel={CHANNELS[2]} active={active === "uploads"} />
      </nav>
      <div className="flex flex-1 flex-col items-center px-4 py-5 text-center">
        <p className="self-start text-sm font-medium text-gray-700">All channels</p>
        <Hash className="mt-6 size-5 text-pink-500" />
        <p className="mt-2 text-sm text-gray-600">Create channels to organize your conversations</p>
        <button
          type="button"
          onClick={() => toast.info("Channels are coming soon.")}
          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-sm text-gray-700 hover:bg-raised"
        >
          <Plus className="size-4" /> Channel
        </button>
      </div>
    </div>
  );
}

function ChannelLink({ channel, active }: { channel: (typeof CHANNELS)[number]; active: boolean }) {
  return (
    <Link
      href={channel.href}
      aria-current={active ? "page" : undefined}
      className={clsx(itemClass, active ? "bg-brand-50 font-medium text-brand-700" : "text-gray-700 hover:bg-raised")}
    >
      <channel.icon className="size-4" />
      {channel.label}
      {channel.badge ? (
        <span className="ml-auto rounded bg-emerald-50 px-1.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          {channel.badge}
        </span>
      ) : null}
    </Link>
  );
}
