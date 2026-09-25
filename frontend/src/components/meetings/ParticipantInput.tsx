"use client";

import { Lock, X } from "lucide-react";
import { useId, useState } from "react";

import { useParticipants } from "@/lib/queries";

/** Chip input for attendee names. Locked names (people who speak in the transcript) can't be removed. */
export function ParticipantInput({
  value,
  onChange,
  locked = [],
}: {
  value: string[];
  onChange: (names: string[]) => void;
  locked?: string[];
}) {
  const [draft, setDraft] = useState("");
  const listId = useId();
  const { data: people = [] } = useParticipants();
  const lockedKeys = new Set(locked.map((name) => name.toLowerCase()));
  const taken = new Set(value.map((name) => name.toLowerCase()));

  function add(raw: string) {
    const name = raw.replace(/\s+/g, " ").trim();
    if (!name || taken.has(name.toLowerCase())) return;
    onChange([...value, name]);
    setDraft("");
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-surface px-2 py-1.5 shadow-card focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100">
      {value.map((name) => {
        const isLocked = lockedKeys.has(name.toLowerCase());
        return (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-0.5 pl-2.5 pr-1.5 text-xs font-medium text-gray-700"
            title={isLocked ? "Speaks in this meeting, so they can't be removed" : undefined}
          >
            {name}
            {isLocked ? (
              <Lock className="size-3 text-gray-400" aria-label="Speaks in this meeting" />
            ) : (
              <button
                type="button"
                onClick={() => onChange(value.filter((other) => other !== name))}
                className="rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                aria-label={`Remove ${name}`}
              >
                <X className="size-3" />
              </button>
            )}
          </span>
        );
      })}
      <input
        value={draft}
        list={listId}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            add(draft);
          } else if (event.key === "Backspace" && !draft && value.length > 0) {
            const last = value[value.length - 1];
            if (!lockedKeys.has(last.toLowerCase())) onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? "Add another…" : "Type a name and press Enter"}
        aria-label="Add participant"
        className="min-w-32 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-gray-400"
      />
      <datalist id={listId}>
        {people
          .filter((person) => !taken.has(person.name.toLowerCase()))
          .map((person) => (
            <option key={person.id} value={person.name} />
          ))}
      </datalist>
    </div>
  );
}
