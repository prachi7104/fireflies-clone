"use client";

import clsx from "clsx";
import { ArrowUpDown, CalendarDays, ChevronDown, Users, X } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { hasActiveFilters, type DatePreset, type LibraryFilters } from "@/lib/filters";
import { useParticipants } from "@/lib/queries";

const DATE_LABELS: Record<DatePreset, string> = {
  any: "Any date",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  custom: "Custom range",
};

function FilterButton({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <DropdownMenuTrigger
      className={clsx(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-card transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        active
          ? "border-brand-300 bg-brand-50 text-brand-700"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
      )}
    >
      {children}
      <ChevronDown className="size-4 opacity-60" />
    </DropdownMenuTrigger>
  );
}

export function MeetingFilters({
  filters,
  onChange,
  onReset,
}: {
  filters: LibraryFilters;
  onChange: (patch: Partial<LibraryFilters>) => void;
  onReset: () => void;
}) {
  const { data: people = [] } = useParticipants();
  const selected = new Set(filters.participantIds);
  const selectedNames = people.filter((person) => selected.has(person.id)).map((person) => person.name);
  const participantLabel =
    selectedNames.length === 0 ? "Participants" : selectedNames.length === 1 ? selectedNames[0] : `${selectedNames.length} participants`;

  function toggle(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ participantIds: [...next] });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <FilterButton active={selected.size > 0}>
          <Users className="size-4" />
          <span className="max-w-40 truncate">{participantLabel}</span>
        </FilterButton>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Meetings with any of</DropdownMenuLabel>
          {people.map((person) => (
            <DropdownMenuCheckboxItem
              key={person.id}
              checked={selected.has(person.id)}
              onCheckedChange={() => toggle(person.id)}
              onSelect={(event) => event.preventDefault()} // keep the menu open for multi-select
            >
              <span className="flex-1 truncate">{person.name}</span>
              <span className="text-xs text-gray-400">{person.meeting_count}</span>
            </DropdownMenuCheckboxItem>
          ))}
          {selected.size > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onChange({ participantIds: [] })}>Clear selection</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <FilterButton active={filters.preset !== "any"}>
          <CalendarDays className="size-4" />
          {DATE_LABELS[filters.preset]}
        </FilterButton>
        <DropdownMenuContent align="start">
          {(Object.keys(DATE_LABELS) as DatePreset[]).map((preset) => (
            <DropdownMenuItem
              key={preset}
              onSelect={() => onChange({ preset, ...(preset === "custom" ? {} : { from: null, to: null }) })}
              className={preset === filters.preset ? "font-semibold text-brand-700" : undefined}
            >
              {DATE_LABELS[preset]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {filters.preset === "custom" ? (
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <input
            type="date"
            aria-label="From date"
            value={filters.from ?? ""}
            max={filters.to ?? undefined}
            onChange={(event) => onChange({ from: event.target.value || null })}
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 shadow-card focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
          <span>to</span>
          <input
            type="date"
            aria-label="To date"
            value={filters.to ?? ""}
            min={filters.from ?? undefined}
            onChange={(event) => onChange({ to: event.target.value || null })}
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 shadow-card focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => onChange({ sort: filters.sort === "newest" ? "oldest" : "newest" })}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-card hover:bg-gray-50"
        aria-label={`Sorted ${filters.sort === "newest" ? "newest first" : "oldest first"}; click to reverse`}
      >
        <ArrowUpDown className="size-4" />
        {filters.sort === "newest" ? "Newest first" : "Oldest first"}
      </button>

      {hasActiveFilters(filters) ? (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          <X className="size-4" /> Clear filters
        </button>
      ) : null}
    </div>
  );
}
