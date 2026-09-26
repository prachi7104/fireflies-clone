"use client";

import { Download, Ellipsis, Globe, Link2, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { UpgradeLink } from "@/components/layout/UpgradeLink";
import type { MeetingDetail } from "@/lib/types";

function copyMeetingLink(id: number) {
  const url = `${window.location.origin}/meetings/${id}`;
  void navigator.clipboard?.writeText(url).then(
    () => toast.success("Meeting link copied"),
    () => toast.error("Couldn't copy the link"),
  );
}

/** Fireflies' meeting header: "#All Meetings / Title", a "…" menu, Upgrade and a Share (copy link) button. */
export function MeetingTopBar({
  meeting,
  onEdit,
  onDelete,
  onExport,
}: {
  meeting: MeetingDetail;
  onEdit: () => void;
  onDelete: () => void;
  onExport?: (format: "md" | "txt") => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3 sm:px-4">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
        <Link href="/meetings" className="shrink-0 text-gray-600 hover:text-gray-900">
          #All Meetings
        </Link>
        <span aria-hidden className="text-gray-300">
          /
        </span>
        <span className="truncate font-medium text-gray-900" title={meeting.title} aria-current="page">
          {meeting.title}
        </span>
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Meeting actions"
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-raised hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <Ellipsis className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil className="size-4" /> Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyMeetingLink(meeting.id)}>
            <Link2 className="size-4" /> Copy link
          </DropdownMenuItem>
          {onExport ? (
            <>
              <DropdownMenuItem onSelect={() => onExport("md")}>
                <Download className="size-4" /> Download notes (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport("txt")}>
                <Download className="size-4" /> Download transcript (.txt)
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem danger onSelect={onDelete}>
            <Trash2 className="size-4" /> Delete meeting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <UpgradeLink />
        <button
          type="button"
          onClick={() => copyMeetingLink(meeting.id)}
          aria-label="Share: copy meeting link"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand-500 px-3 text-sm font-medium text-white shadow-card hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <Globe className="size-4" />
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>
    </header>
  );
}
