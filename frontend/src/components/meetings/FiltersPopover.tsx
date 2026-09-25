"use client";

import clsx from "clsx";
import { CalendarDays, Check, ListFilter, Mic, Search, Users, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import type { DatePreset, LibraryFilters } from "@/lib/filters";
import { useParticipants } from "@/lib/queries";
import type { MeetingSource } from "@/lib/types";

type Category = "participants" | "date" | "source";

const CATEGORIES: { value: Category; label: string; icon: LucideIcon }[] = [
  { value: "participants", label: "Participants", icon: Users },
  { value: "date", label: "Date Range", icon: CalendarDays },
  { value: "source", label: "Captured From", icon: Mic },
];

export const DATE_LABELS: Record<DatePreset, string> = {
  any: "Any Time",
  today: "Today",
  "7d": "Last 7 Days",
  "14d": "Last 14 Days",
  "30d": "Last 30 Days",
  custom: "Custom Date Range",
};

export const SOURCE_LABELS: Record<MeetingSource, string> = {
  upload: "Uploaded file",
  paste: "Pasted transcript",
  seed: "Recorded meeting",
};

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={clsx(
        "flex size-4 shrink-0 items-center justify-center rounded border",
        checked ? "border-brand-500 bg-brand-500 text-white" : "border-gray-300",
      )}
    >
      {checked ? <Check className="size-3" strokeWidth={3} /> : null}
    </span>
  );
}

const optionClass =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-gray-700 hover:bg-raised focus-visible:outline-2 focus-visible:outline-brand-500";

/** Fireflies' two-pane Filters pop-over: categories on the left, the chosen category's options on the right. */
export function FiltersPopover({
  filters,
  onChange,
  onClearAll,
  activeCount,
}: {
  filters: LibraryFilters;
  onChange: (patch: Partial<LibraryFilters>) => void;
  onClearAll: () => void;
  activeCount: number;
}) {
  const [category, setCategory] = useState<Category>("participants");
  const [personQuery, setPersonQuery] = useState("");
  const { data: people = [] } = useParticipants();
  const shownPeople = people.filter((person) => person.name.toLowerCase().includes(personQuery.trim().toLowerCase()));
  const selectedPeople = new Set(filters.participantIds);

  function togglePerson(id: number) {
    const next = new Set(selectedPeople);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ participantIds: [...next] });
  }

  function toggleSource(source: MeetingSource) {
    const next = filters.sources.includes(source)
      ? filters.sources.filter((value) => value !== source)
      : [...filters.sources, source];
    onChange({ sources: next });
  }

  return (
    <Popover>
      <PopoverTrigger
        className={clsx(
          "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
          activeCount > 0
            ? "border-brand-300 bg-brand-50 text-brand-700"
            : "border-gray-200 bg-surface text-gray-700 hover:bg-raised",
        )}
      >
        <ListFilter className="size-4" />
        Filters
        {activeCount > 0 ? (
          <span className="rounded-full bg-brand-500 px-1.5 text-xs text-white">{activeCount}</span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="flex w-[min(34rem,calc(100vw-2rem))] overflow-hidden p-0">
        <div className="flex w-40 shrink-0 flex-col border-r border-line p-2 sm:w-44">
          {CATEGORIES.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setCategory(item.value)}
              aria-pressed={category === item.value}
              className={clsx(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm",
                category === item.value ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-raised",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="mt-auto rounded-md border border-line px-2.5 py-1.5 text-sm text-gray-600 hover:bg-raised disabled:opacity-50"
          >
            Clear All Filters
          </button>
        </div>

        <div className="flex h-80 min-w-0 flex-1 flex-col p-2">
          {category === "participants" ? (
            <>
              <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={personQuery}
                  onChange={(event) => setPersonQuery(event.target.value)}
                  placeholder="Search participants"
                  aria-label="Search participants"
                  className="h-9 w-full rounded-lg border border-gray-200 bg-surface pl-8 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {shownPeople.length === 0 ? (
                  <p className="px-2.5 py-4 text-sm text-gray-500">No one matches.</p>
                ) : (
                  shownPeople.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      role="checkbox"
                      aria-checked={selectedPeople.has(person.id)}
                      onClick={() => togglePerson(person.id)}
                      className={optionClass}
                    >
                      <Checkbox checked={selectedPeople.has(person.id)} />
                      <span className="flex-1 truncate">{person.name}</span>
                      <span className="text-xs text-gray-400">{person.meeting_count}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : category === "date" ? (
            <div role="radiogroup" aria-label="Date range" className="overflow-y-auto">
              {(Object.keys(DATE_LABELS) as DatePreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={filters.preset === preset}
                  onClick={() => onChange({ preset, ...(preset === "custom" ? {} : { from: null, to: null }) })}
                  className={clsx(optionClass, "justify-between")}
                >
                  {DATE_LABELS[preset]}
                  <span
                    aria-hidden
                    className={clsx(
                      "size-4 rounded-full border",
                      filters.preset === preset ? "border-[5px] border-brand-500" : "border-gray-300",
                    )}
                  />
                </button>
              ))}
              {filters.preset === "custom" ? (
                <div className="mt-2 grid grid-cols-2 gap-2 px-2.5">
                  <label className="text-xs text-gray-500">
                    From
                    <input
                      type="date"
                      value={filters.from ?? ""}
                      max={filters.to ?? undefined}
                      onChange={(event) => onChange({ from: event.target.value || null })}
                      className="mt-1 h-9 w-full rounded-lg border border-gray-200 bg-surface px-2 text-sm text-gray-900"
                    />
                  </label>
                  <label className="text-xs text-gray-500">
                    To
                    <input
                      type="date"
                      value={filters.to ?? ""}
                      min={filters.from ?? undefined}
                      onChange={(event) => onChange({ to: event.target.value || null })}
                      className="mt-1 h-9 w-full rounded-lg border border-gray-200 bg-surface px-2 text-sm text-gray-900"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <div>
              {(Object.keys(SOURCE_LABELS) as MeetingSource[]).map((source) => (
                <button
                  key={source}
                  type="button"
                  role="checkbox"
                  aria-checked={filters.sources.includes(source)}
                  onClick={() => toggleSource(source)}
                  className={optionClass}
                >
                  <Checkbox checked={filters.sources.includes(source)} />
                  {SOURCE_LABELS[source]}
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
