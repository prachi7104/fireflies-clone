"use client";

import clsx from "clsx";
import { ClipboardPaste, CloudUpload, FileText, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { errorMessage } from "@/lib/api";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/format";
import { useCreateMeeting, useImportMeeting } from "@/lib/queries";
import type { MeetingDetail } from "@/lib/types";

import { MeetingForm, type MeetingFormValue } from "./MeetingForm";

const MAX_BYTES = 1_000_000;
const ACCEPTED = [".txt", ".vtt", ".json"];
const SAMPLES = [
  { href: "/samples/standup.txt", label: "standup.txt" },
  { href: "/samples/design-review.vtt", label: "design-review.vtt" },
  { href: "/samples/customer-call.json", label: "customer-call.json" },
];

export function CreateMeetingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a meeting"
      description="Upload a transcript file or paste one. Notes and action items are generated automatically."
      className="max-w-2xl"
    >
      {/* Mounted only while open, so every opening starts with a clean form. */}
      {open ? <CreateMeetingForm onDone={() => onOpenChange(false)} /> : null}
    </Dialog>
  );
}

function CreateMeetingForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "paste">("upload");
  const [form, setForm] = useState<MeetingFormValue>(() => ({
    title: "",
    startedAtLocal: toLocalInputValue(new Date()),
    participants: [],
  }));
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const createMeeting = useCreateMeeting();
  const importMeeting = useImportMeeting();
  const pending = createMeeting.isPending || importMeeting.isPending;

  function pickFile(candidate: File | undefined) {
    setError(null);
    if (!candidate) return;
    const extension = candidate.name.slice(candidate.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED.includes(extension)) return setError("Choose a .txt, .vtt or .json transcript.");
    if (candidate.size > MAX_BYTES) return setError("That file is larger than 1 MB.");
    setFile(candidate);
  }

  function succeed(meeting: MeetingDetail) {
    toast.success("Meeting created", {
      description: `${meeting.segments.length} transcript lines · ${meeting.action_items.length} action items found`,
    });
    onDone();
    router.push(`/meetings/${meeting.id}`);
  }

  function submit() {
    setError(null);
    if (!form.startedAtLocal) return setError("Choose the meeting date and time.");
    const startedAt = fromLocalInputValue(form.startedAtLocal);
    const onError = (err: unknown) => setError(errorMessage(err));

    if (tab === "upload") {
      if (!file) return setError("Choose a transcript file to upload.");
      const data = new FormData();
      data.append("file", file);
      if (form.title.trim()) data.append("title", form.title.trim());
      data.append("started_at", startedAt);
      if (form.participants.length) data.append("participants", form.participants.join(","));
      importMeeting.mutate(data, { onSuccess: succeed, onError });
    } else {
      if (!form.title.trim()) return setError("Give the meeting a title.");
      if (!text.trim()) return setError("Paste the transcript text.");
      createMeeting.mutate(
        { title: form.title.trim(), started_at: startedAt, transcript: text, participants: form.participants },
        { onSuccess: succeed, onError },
      );
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <div role="tablist" aria-label="Transcript source" className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1">
        {(
          [
            ["upload", "Upload file", CloudUpload],
            ["paste", "Paste transcript", ClipboardPaste],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setError(null);
            }}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors",
              tab === key ? "bg-white text-gray-900 shadow-card" : "text-gray-500 hover:text-gray-800",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "upload" ? (
        <div>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              pickFile(event.dataTransfer.files[0]);
            }}
            className={clsx(
              "flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
              dragging ? "border-brand-400 bg-brand-25" : "border-gray-300 hover:border-brand-300 hover:bg-gray-50",
            )}
          >
            {file ? (
              <>
                <FileText className="mb-2 size-8 text-brand-500" />
                <span className="text-sm font-semibold text-gray-900">{file.name}</span>
                <span className="mt-0.5 text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · click to choose another</span>
              </>
            ) : (
              <>
                <CloudUpload className="mb-2 size-8 text-gray-400" />
                <span className="text-sm font-semibold text-brand-600">Click to upload</span>
                <span className="text-sm text-gray-500"> or drag and drop</span>
                <span className="mt-1 text-xs text-gray-500">.txt, .vtt or .json · up to 1 MB</span>
              </>
            )}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(event) => pickFile(event.target.files?.[0])}
          />
          <p className="mt-2 text-xs text-gray-500">
            No transcript handy? Download a sample:{" "}
            {SAMPLES.map((sample, index) => (
              <span key={sample.href}>
                <a href={sample.href} download className="font-medium text-brand-600 hover:underline">
                  {sample.label}
                </a>
                {index < SAMPLES.length - 1 ? ", " : ""}
              </span>
            ))}
          </p>
        </div>
      ) : (
        <div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            placeholder={"[00:00] Priya Nair: Welcome everyone, let's get started.\n[00:12] Marcus Chen: I'll share the mockups by Friday."}
            aria-label="Transcript text"
            className="w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs leading-5 text-gray-900 shadow-card placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            One line per speaker, like <code className="rounded bg-gray-100 px-1">[mm:ss] Name: text</code>. WebVTT and
            JSON work too.
          </p>
        </div>
      )}

      <MeetingForm mode="create" value={form} onChange={setForm} />

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
        <Button onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Generating notes…" : "Create meeting"}
        </Button>
      </div>
    </form>
  );
}
