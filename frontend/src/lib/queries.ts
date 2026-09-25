"use client";

// Server state: every read is a query and every write is a mutation that refreshes what it changed.
import { keepPreviousData, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ApiError,
  createActionItem,
  createMeeting,
  deleteActionItem,
  deleteMeeting,
  getMe,
  getMeeting,
  importMeeting,
  listMeetings,
  listParticipants,
  listTasks,
  updateActionItem,
  updateMeeting,
} from "./api";
import type {
  ActionItem,
  ActionItemCreateInput,
  ActionItemUpdateInput,
  MeetingDetail,
  MeetingListParams,
  MeetingUpdateInput,
  TaskListParams,
} from "./types";

export const queryKeys = {
  me: ["me"] as const,
  meetings: (params: MeetingListParams) => ["meetings", params] as const,
  meeting: (id: number) => ["meeting", id] as const,
  participants: (q: string) => ["participants", q] as const,
  tasks: (params: TaskListParams) => ["tasks", params] as const,
};

export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: getMe, staleTime: Infinity });
}

export function useMeetings(params: MeetingListParams) {
  return useQuery({
    queryKey: queryKeys.meetings(params),
    queryFn: () => listMeetings(params),
    placeholderData: keepPreviousData, // keep the old list on screen while a new filter loads
  });
}

export function useMeeting(id: number, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    queryKey: queryKeys.meeting(id),
    queryFn: () => getMeeting(id),
    retry: (failures, error) => !(error instanceof ApiError && error.status === 404) && failures < 1,
    meta: { silentError: true }, // the page renders its own not-found / error state
  });
}

/** Several meetings' details at once (Home's AI Feed shows each meeting's overview). */
export function useMeetingDetails(ids: number[]) {
  return useQueries({
    queries: ids.map((id) => ({ queryKey: queryKeys.meeting(id), queryFn: () => getMeeting(id) })),
  });
}

export function useParticipants(q = "") {
  return useQuery({ queryKey: queryKeys.participants(q), queryFn: () => listParticipants(q || undefined) });
}

function useRefreshLists() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["meetings"] });
    queryClient.invalidateQueries({ queryKey: ["participants"] });
  };
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const refreshLists = useRefreshLists();
  return useMutation({
    mutationFn: createMeeting,
    meta: { silentError: true }, // the dialog shows the error inline
    onSuccess: (meeting) => {
      queryClient.setQueryData(queryKeys.meeting(meeting.id), meeting);
      refreshLists();
    },
  });
}

export function useImportMeeting() {
  const queryClient = useQueryClient();
  const refreshLists = useRefreshLists();
  return useMutation({
    mutationFn: importMeeting,
    meta: { silentError: true },
    onSuccess: (meeting) => {
      queryClient.setQueryData(queryKeys.meeting(meeting.id), meeting);
      refreshLists();
    },
  });
}

export function useUpdateMeeting(id: number) {
  const queryClient = useQueryClient();
  const refreshLists = useRefreshLists();
  return useMutation({
    mutationFn: (input: MeetingUpdateInput) => updateMeeting(id, input),
    meta: { silentError: true },
    onSuccess: (meeting) => {
      queryClient.setQueryData(queryKeys.meeting(id), meeting);
      refreshLists();
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();
  const refreshLists = useRefreshLists();
  return useMutation({
    mutationFn: deleteMeeting,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.meeting(id) });
      refreshLists();
    },
  });
}

export function useCreateActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ActionItemCreateInput) => createActionItem(meetingId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meeting(meetingId) });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

/** Optimistic: the checkbox flips instantly and rolls back if the server says no. */
export function useUpdateActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  const key = queryKeys.meeting(meetingId);
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ActionItemUpdateInput }) => updateActionItem(id, input),
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<MeetingDetail>(key);
      if (previous) {
        queryClient.setQueryData<MeetingDetail>(key, {
          ...previous,
          action_items: previous.action_items.map((item): ActionItem => {
            if (item.id !== id) return item;
            const completedAt =
              input.is_done === undefined ? item.completed_at : input.is_done ? new Date().toISOString() : null;
            return { ...item, ...input, completed_at: completedAt };
          }),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteActionItem(meetingId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteActionItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meeting(meetingId) });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useTasks(params: TaskListParams) {
  return useQuery({ queryKey: queryKeys.tasks(params), queryFn: () => listTasks(params), placeholderData: keepPreviousData });
}

/** Tasks page edits: the item may belong to any meeting, so refresh that meeting and every task list. */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: ActionItemUpdateInput }) => updateActionItem(id, input),
    onSettled: (item) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      if (item) queryClient.invalidateQueries({ queryKey: queryKeys.meeting(item.meeting_id) });
    },
  });
}

/** "+ New" on the Tasks page: add an action item to any of your meetings. */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ meetingId, input }: { meetingId: number; input: ActionItemCreateInput }) => createActionItem(meetingId, input),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.meeting(item.meeting_id) });
    },
  });
}
