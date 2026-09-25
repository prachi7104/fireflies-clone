"use client";

import { ArrowLeft, Download, Ellipsis, Link2, Pencil, Trash2 } from "lucide-react";
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
import { formatDuration, formatMeetingDate } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

export function MeetingHeader({
  meeting,
  onEdit,
  onDelete,
  onExport,
}: {
  meeting: MeetingDetail;
  onEdit?: () => void;
  onDelete?: () => void;
  onExport?: (format: "md" | "txt") => void;
}) {
  return (
    <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 md:px-6">
      <Link href="/meetings" className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800">
        <ArrowLeft className="size-3.5" /> Meetings
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold text-gray-900" title={meeting.title}>
            {meeting.title}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-gray-500">
            <span>{formatMeetingDate(meeting.started_at)}</span>
            <span aria-hidden>·</span>
            <span>{formatDuration(meeting.duration_ms)}</span>
            <span aria-hidden>·</span>
            <span>
              {meeting.participants.length} participant{meeting.participants.length === 1 ? "" : "s"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AvatarStack people={meeting.participants} max={5} size="md" />
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href.split("?")[0]).then(() => toast.success("Link copied"));
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-card hover:bg-gray-50"
          >
            <Link2 className="size-4" /> Share
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Meeting actions"
              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-600 shadow-card hover:bg-gray-50"
            >
              <Ellipsis className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {onEdit ? (
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil className="size-4" /> Edit details
                </DropdownMenuItem>
              ) : null}
              {onExport ? (
                <>
                  <DropdownMenuItem onSelect={() => onExport("md")}>
                    <Download className="size-4" /> Export as Markdown
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onExport("txt")}>
                    <Download className="size-4" /> Export as text
                  </DropdownMenuItem>
                </>
              ) : null}
              {onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem danger onSelect={onDelete}>
                    <Trash2 className="size-4" /> Delete meeting
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
