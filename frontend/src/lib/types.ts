// TypeScript mirrors of the backend API schemas. Field names match the API's snake_case.

export interface Health {
  status: string;
  database: string;
  fts5: boolean;
  llm_provider: string;
  boot_count: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface ParticipantRef {
  id: number;
  name: string;
}

export interface MeetingParticipant extends ParticipantRef {
  is_speaker: boolean;
}

export interface ParticipantListItem extends ParticipantRef {
  meeting_count: number;
}

export interface Segment {
  id: number;
  position: number;
  speaker_id: number;
  start_ms: number;
  end_ms: number;
  text: string;
}

export interface Summary {
  overview: string;
  notes: string[];
  generated_by: "seed" | "rules" | "llm";
  model: string | null;
  generated_at: string;
}

export interface Chapter {
  id: number;
  position: number;
  title: string;
  start_ms: number;
  gist: string | null;
}

export interface ActionItem {
  id: number;
  meeting_id: number;
  text: string;
  assignee_id: number | null;
  segment_id: number | null;
  start_ms: number | null;
  is_done: boolean;
  completed_at: string | null;
  source: "ai" | "user";
  created_at: string;
}

export type MeetingSource = "seed" | "upload" | "paste";

export interface TranscriptMatch {
  segment_id: number;
  start_ms: number;
  text: string;
}

export interface MeetingListItem {
  id: number;
  title: string;
  started_at: string;
  duration_ms: number;
  source: MeetingSource;
  participants: ParticipantRef[];
  open_action_items: number;
  match: TranscriptMatch | null;
}

export interface MeetingListPage {
  items: MeetingListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface MeetingDetail {
  id: number;
  title: string;
  started_at: string;
  duration_ms: number;
  source: MeetingSource;
  created_at: string;
  updated_at: string;
  participants: MeetingParticipant[];
  segments: Segment[];
  summary: Summary | null;
  keywords: string[];
  chapters: Chapter[];
  action_items: ActionItem[];
}

export interface MeetingListParams {
  q?: string;
  participant_id?: number[];
  date_from?: string;
  date_to?: string;
  source?: MeetingSource[];
  sort?: "newest" | "oldest";
  limit?: number;
  offset?: number;
}

export type TranscriptFormat = "auto" | "txt" | "vtt" | "json";

export interface MeetingCreateInput {
  title: string;
  started_at?: string;
  transcript: string;
  format?: TranscriptFormat;
  participants?: string[];
}

export interface MeetingUpdateInput {
  title?: string;
  started_at?: string;
  participants?: string[];
}

export interface ActionItemCreateInput {
  text: string;
  assignee_id?: number | null;
}

export interface ActionItemUpdateInput {
  text?: string;
  assignee_id?: number | null;
  is_done?: boolean;
}

export interface TaskItem extends ActionItem {
  meeting_title: string;
  meeting_started_at: string;
  assignee_name: string | null;
}

export interface TaskListParams {
  scope: "mine" | "all";
  status: "open" | "done" | "all";
}
