// The only module that talks to the backend. Every request goes through apiFetch.
import type {
  ActionItem,
  ActionItemCreateInput,
  ActionItemUpdateInput,
  Health,
  MeetingCreateInput,
  MeetingDetail,
  MeetingListPage,
  MeetingListParams,
  MeetingUpdateInput,
  ParticipantListItem,
  User,
} from "./types";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/+$/, "");

// Mock session: the backend treats this header as the logged-in user (the seeded demo user).
const CURRENT_USER_ID = "1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | null | undefined | Array<string | number>;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  json?: unknown;
  formData?: FormData;
  query?: Record<string, QueryValue>;
}

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(`${API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, String(item));
    }
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { "X-User-Id": CURRENT_USER_ID };
  let body: BodyInit | undefined;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.formData) {
    body = options.formData;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), { method: options.method ?? "GET", headers, body });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, describeError(data, response.status));
  return data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.detail;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// FastAPI returns {"detail": "..."} for domain errors and {"detail": [{loc, msg}]} for validation errors.
function describeError(data: unknown, status: number): string {
  if (data && typeof data === "object" && "detail" in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: string; loc?: unknown[] };
      const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : undefined;
      const message = (first.msg ?? "Invalid value").replace(/^Value error, /, "");
      return field && field !== "body" ? `${String(field)}: ${message}` : message;
    }
  }
  return `Request failed (${status})`;
}

export const getHealth = () => apiFetch<Health>("/api/health");
export const getMe = () => apiFetch<User>("/api/me");

export const listMeetings = (params: MeetingListParams) =>
  apiFetch<MeetingListPage>("/api/meetings", { query: { ...params } });
export const getMeeting = (id: number) => apiFetch<MeetingDetail>(`/api/meetings/${id}`);
export const createMeeting = (input: MeetingCreateInput) =>
  apiFetch<MeetingDetail>("/api/meetings", { method: "POST", json: input });
export const importMeeting = (formData: FormData) =>
  apiFetch<MeetingDetail>("/api/meetings/import", { method: "POST", formData });
export const updateMeeting = (id: number, input: MeetingUpdateInput) =>
  apiFetch<MeetingDetail>(`/api/meetings/${id}`, { method: "PATCH", json: input });
export const deleteMeeting = (id: number) => apiFetch<void>(`/api/meetings/${id}`, { method: "DELETE" });

export const listParticipants = (q?: string) =>
  apiFetch<ParticipantListItem[]>("/api/participants", { query: { q } });

export const createActionItem = (meetingId: number, input: ActionItemCreateInput) =>
  apiFetch<ActionItem>(`/api/meetings/${meetingId}/action-items`, { method: "POST", json: input });
export const updateActionItem = (id: number, input: ActionItemUpdateInput) =>
  apiFetch<ActionItem>(`/api/action-items/${id}`, { method: "PATCH", json: input });
export const deleteActionItem = (id: number) => apiFetch<void>(`/api/action-items/${id}`, { method: "DELETE" });

export const exportMeetingUrl = (id: number, format: "md" | "txt") =>
  buildUrl(`/api/meetings/${id}/export`, { format });
