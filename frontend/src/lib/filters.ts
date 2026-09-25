// Library filters live in the URL: shareable, survive a refresh, and the Back button restores them.
import type { MeetingListParams } from "./types";

export type DatePreset = "any" | "7d" | "30d" | "custom";
export type LibraryView = "all" | "uploads";

export interface LibraryFilters {
  q: string;
  participantIds: number[];
  preset: DatePreset;
  from: string | null; // YYYY-MM-DD, local calendar date (custom range only)
  to: string | null; // YYYY-MM-DD, inclusive
  sort: "newest" | "oldest";
  view: LibraryView;
}

export const DEFAULT_FILTERS: LibraryFilters = {
  q: "",
  participantIds: [],
  preset: "any",
  from: null,
  to: null,
  sort: "newest",
  view: "all",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseFilters(params: URLSearchParams): LibraryFilters {
  const preset = params.get("preset");
  const from = params.get("from");
  const to = params.get("to");
  return {
    q: params.get("q") ?? "",
    participantIds: params
      .getAll("participant")
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0),
    preset: preset === "7d" || preset === "30d" || preset === "custom" ? preset : "any",
    from: from && ISO_DATE.test(from) ? from : null,
    to: to && ISO_DATE.test(to) ? to : null,
    sort: params.get("sort") === "oldest" ? "oldest" : "newest",
    view: params.get("view") === "uploads" ? "uploads" : "all",
  };
}

export function serializeFilters(filters: LibraryFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  for (const id of filters.participantIds) params.append("participant", String(id));
  if (filters.preset !== "any") params.set("preset", filters.preset);
  if (filters.preset === "custom") {
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
  }
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.view !== "all") params.set("view", filters.view);
  return params;
}

export function hasActiveFilters(filters: LibraryFilters): boolean {
  return Boolean(filters.q) || filters.participantIds.length > 0 || filters.preset !== "any";
}

function localMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Convert URL filters into API parameters. Dates become UTC instants of the viewer's local days. */
export function toApiParams(filters: LibraryFilters, now: Date): MeetingListParams {
  const params: MeetingListParams = { sort: filters.sort };
  if (filters.q) params.q = filters.q;
  if (filters.participantIds.length) params.participant_id = filters.participantIds;
  if (filters.view === "uploads") params.source = ["upload", "paste"];

  if (filters.preset === "7d" || filters.preset === "30d") {
    const start = localMidnight(now);
    start.setDate(start.getDate() - (filters.preset === "7d" ? 6 : 29));
    params.date_from = start.toISOString();
  } else if (filters.preset === "custom") {
    if (filters.from) params.date_from = parseLocalDate(filters.from).toISOString();
    if (filters.to) {
      const end = parseLocalDate(filters.to);
      end.setDate(end.getDate() + 1); // the API's upper bound is exclusive
      params.date_to = end.toISOString();
    }
  }
  return params;
}
