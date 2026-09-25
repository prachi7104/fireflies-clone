"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { CreateMeetingDialog, type CreateTab } from "./CreateMeetingDialog";

const OpenCreateContext = createContext<(tab?: CreateTab) => void>(() => {});

/** One "Add a meeting" dialog for the whole app; the Capture menu, Home cards and empty states all open it. */
export function CreateMeetingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; tab: CreateTab }>({ open: false, tab: "upload" });
  const open = useCallback((tab: CreateTab = "upload") => setState({ open: true, tab }), []);

  return (
    <OpenCreateContext.Provider value={useMemo(() => open, [open])}>
      {children}
      <CreateMeetingDialog
        open={state.open}
        initialTab={state.tab}
        onOpenChange={(next) => setState((current) => ({ ...current, open: next }))}
      />
    </OpenCreateContext.Provider>
  );
}

export function useOpenCreateMeeting() {
  return useContext(OpenCreateContext);
}
