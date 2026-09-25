"use client";

import clsx from "clsx";
import { Check, Trash2, UserRound } from "lucide-react";
import { useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import type { ActionItem, MeetingParticipant } from "@/lib/types";

import { TimeLink } from "./TimeLink";

export function ActionItemRow({
  item,
  participants,
  onToggle,
  onRename,
  onAssign,
  onDelete,
  onSeek,
}: {
  item: ActionItem;
  participants: MeetingParticipant[];
  onToggle: () => void;
  onRename: (text: string) => void;
  onAssign: (assigneeId: number | null) => void;
  onDelete: () => void;
  onSeek: (ms: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const assignee = participants.find((person) => person.id === item.assignee_id) ?? null;

  function commit() {
    const text = draft.trim();
    setEditing(false);
    if (text && text !== item.text) onRename(text);
    else setDraft(item.text);
  }

  return (
    <li className="group flex items-start gap-3 rounded-lg px-2 py-1.5 hover:bg-raised">
      <button
        type="button"
        role="checkbox"
        aria-checked={item.is_done}
        aria-label={item.is_done ? `Mark "${item.text}" as not done` : `Mark "${item.text}" as done`}
        onClick={onToggle}
        className={clsx(
          "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded border transition-colors",
          item.is_done ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300 bg-surface hover:border-brand-400",
        )}
      >
        {item.is_done ? <Check className="size-3" strokeWidth={3} /> : null}
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            value={draft}
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") commit();
              if (event.key === "Escape") {
                setDraft(item.text);
                setEditing(false);
              }
            }}
            aria-label="Action item text"
            className="w-full rounded-md border border-brand-300 bg-surface px-2 py-1 text-sm outline-none ring-4 ring-brand-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(item.text);
              setEditing(true);
            }}
            title="Click to edit"
            className={clsx(
              "block w-full text-left text-[15px] leading-6",
              item.is_done ? "text-gray-400 line-through" : "text-gray-800",
            )}
          >
            {item.text}
          </button>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 text-xs text-gray-600 hover:bg-gray-100"
              aria-label={assignee ? `Assigned to ${assignee.name}; change` : "Assign"}
            >
              {assignee ? (
                <>
                  <Avatar id={assignee.id} name={assignee.name} size="xs" className="ring-0" />
                  {assignee.name}
                </>
              ) : (
                <>
                  <span className="flex size-5 items-center justify-center rounded-full border border-dashed border-gray-300">
                    <UserRound className="size-3 text-gray-400" />
                  </span>
                  Assign
                </>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Assign to</DropdownMenuLabel>
              {participants.map((person) => (
                <DropdownMenuItem key={person.id} onSelect={() => onAssign(person.id)}>
                  <Avatar id={person.id} name={person.name} size="xs" className="ring-0" />
                  {person.name}
                  {person.id === item.assignee_id ? <Check className="ml-auto size-4 text-brand-600" /> : null}
                </DropdownMenuItem>
              ))}
              {item.assignee_id !== null ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onAssign(null)}>Unassign</DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {item.start_ms !== null ? <TimeLink ms={item.start_ms} onSeek={onSeek} /> : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        className="rounded p-1 text-gray-400 opacity-0 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 dark:hover:bg-red-950"
        aria-label={`Delete "${item.text}"`}
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}
