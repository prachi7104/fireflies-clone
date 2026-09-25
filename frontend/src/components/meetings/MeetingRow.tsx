"use client";

import { ClipboardPaste, CloudUpload, Ellipsis, ExternalLink, Link2, Pencil, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { AvatarStack } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { HighlightedText } from "@/components/ui/HighlightedText";
import { formatClock, formatDuration, formatMeetingDate } from "@/lib/format";
import { findRanges } from "@/lib/highlight";
import type { MeetingListItem, MeetingSource } from "@/lib/types";

const SOURCE: Record<MeetingSource, { icon: typeof Video; label: string }> = {
  seed: { icon: Video, label: "Recorded meeting" },
  upload: { icon: CloudUpload, label: "Uploaded transcript" },
  paste: { icon: ClipboardPaste, label: "Pasted transcript" },
};

export function MeetingRow({
  meeting,
  query,
  onEdit,
  onDelete,
}: {
  meeting: MeetingListItem;
  query: string;
  onEdit?: (meeting: MeetingListItem) => void;
  onDelete?: (meeting: MeetingListItem) => void;
}) {
  const source = SOURCE[meeting.source];
  const href = `/meetings/${meeting.id}`;
  const matchRanges = meeting.match
    ? query.split(/\s+/).filter(Boolean).flatMap((word) => findRanges(meeting.match!.text, word))
    : [];

  return (
    <li className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-raised">
      <span
        className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600"
        title={source.label}
      >
        <source.icon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <Link href={href} className="block truncate text-sm font-medium text-gray-900 hover:text-brand-700">
          {/* Stretched link: the whole row is clickable, but the menu stays independently clickable. */}
          <span className="absolute inset-0" aria-hidden />
          {meeting.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
          <span>{formatMeetingDate(meeting.started_at)}</span>
          <span aria-hidden>·</span>
          <span>{formatDuration(meeting.duration_ms)}</span>
          {meeting.open_action_items > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span className="text-brand-700">
                {meeting.open_action_items} open action item{meeting.open_action_items === 1 ? "" : "s"}
              </span>
            </>
          ) : null}
        </p>
        {meeting.match ? (
          <Link
            href={`${href}?t=${Math.floor(meeting.match.start_ms / 1000)}`}
            className="relative z-10 mt-2 flex items-start gap-2 rounded-md bg-raised px-2.5 py-1.5 text-xs text-gray-600 ring-1 ring-line hover:ring-brand-200"
          >
            <span className="shrink-0 font-medium tabular-nums text-link">{formatClock(meeting.match.start_ms)}</span>
            <span className="line-clamp-2">
              <HighlightedText text={meeting.match.text} ranges={matchRanges} />
            </span>
          </Link>
        ) : null}
      </div>

      <div className="relative z-10 flex shrink-0 items-center gap-3">
        <div className="hidden sm:block">
          <AvatarStack people={meeting.participants} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${meeting.title}`}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-2 focus-visible:outline-brand-500"
          >
            <Ellipsis className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem asChild>
              <Link href={href}>
                <ExternalLink className="size-4" /> Open
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                void navigator.clipboard
                  ?.writeText(`${window.location.origin}${href}`)
                  .then(() => toast.success("Link copied"));
              }}
            >
              <Link2 className="size-4" /> Copy link
            </DropdownMenuItem>
            {onEdit ? (
              <DropdownMenuItem onSelect={() => onEdit(meeting)}>
                <Pencil className="size-4" /> Edit details
              </DropdownMenuItem>
            ) : null}
            {onDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem danger onSelect={() => onDelete(meeting)}>
                  <Trash2 className="size-4" /> Delete
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
