"use client";

import { AudioLines, CalendarPlus, ChevronDown, ClipboardPaste, Upload, Video } from "lucide-react";
import { toast } from "sonner";

import { useOpenCreateMeeting } from "@/components/meetings/CreateMeetingContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu";

/** Fireflies' "Capture ▾" split button. Upload and paste are real; live capture and scheduling are placeholders. */
export function CaptureButton() {
  const openCreate = useOpenCreateMeeting();
  return (
    <div className="inline-flex h-9 shrink-0 rounded-lg bg-brand-500 text-white shadow-card">
      <button
        type="button"
        onClick={() => openCreate("upload")}
        className="inline-flex items-center gap-2 rounded-l-lg px-3 text-sm font-medium hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <Video className="size-4" />
        <span className="hidden sm:inline">Capture</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="More ways to add a meeting"
          className="inline-flex items-center rounded-r-lg border-l border-white/25 px-2 hover:bg-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        >
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-60">
          <DropdownMenuItem onSelect={() => toast.info("Adding the notetaker to a live call is coming soon.")}>
            <Video className="size-4" /> Add to live meeting
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast.info("Calendar scheduling is coming soon.")}>
            <CalendarPlus className="size-4" /> Schedule new meeting
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              toast.info("Speech-to-text is coming soon.", {
                description: "Upload or paste a transcript instead; notes and action items are generated from it.",
              })
            }
          >
            <AudioLines className="size-4" /> Upload audio or video
            <span className="ml-auto rounded bg-raised px-1.5 text-[10px] font-medium text-gray-500">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openCreate("upload")}>
            <Upload className="size-4" /> Upload transcript file
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openCreate("paste")}>
            <ClipboardPaste className="size-4" /> Paste transcript
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
