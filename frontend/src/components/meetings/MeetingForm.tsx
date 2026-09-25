"use client";

import type { ReactNode } from "react";

import { ParticipantInput } from "./ParticipantInput";

export interface MeetingFormValue {
  title: string;
  startedAtLocal: string; // value of <input type="datetime-local">
  participants: string[];
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-gray-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-surface px-3 text-sm text-gray-900 shadow-card placeholder:text-gray-400 " +
  "focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100";

/** The meeting details fields, shared by the create and edit dialogs. */
export function MeetingForm({
  mode,
  value,
  onChange,
  lockedParticipants = [],
}: {
  mode: "create" | "edit";
  value: MeetingFormValue;
  onChange: (value: MeetingFormValue) => void;
  lockedParticipants?: string[];
}) {
  return (
    <div className="space-y-4">
      <Field label="Title" hint={mode === "create" ? "Leave empty on upload to use the file name." : undefined}>
        <input
          value={value.title}
          maxLength={200}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          placeholder="e.g. Weekly product sync"
          className={inputClass}
        />
      </Field>
      <Field label="Date and time">
        <input
          type="datetime-local"
          value={value.startedAtLocal}
          onChange={(event) => onChange({ ...value, startedAtLocal: event.target.value })}
          className={inputClass}
          required
        />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-medium text-gray-700">Participants</span>
        <ParticipantInput
          value={value.participants}
          onChange={(participants) => onChange({ ...value, participants })}
          locked={lockedParticipants}
        />
        <span className="mt-1 block text-xs text-gray-500">
          {mode === "create"
            ? "Speakers are added automatically from the transcript. Add anyone else who attended."
            : "People who speak in the transcript are locked."}
        </span>
      </div>
    </div>
  );
}
