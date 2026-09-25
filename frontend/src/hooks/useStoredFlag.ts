"use client";

import { useCallback, useSyncExternalStore } from "react";

const CHANGE_EVENT = "storedflagchange";
// Fallback when localStorage is blocked, so a toggle still works for this visit.
const memory = new Map<string, boolean>();

function read(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === "1";
  } catch {
    return memory.get(key) ?? fallback;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  // Announce once after subscribing, so the saved value replaces the server default after hydration.
  const id = setTimeout(onChange, 0);
  return () => {
    clearTimeout(id);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** A boolean UI preference remembered in this browser (e.g. whether the sidebar is expanded). */
export function useStoredFlag(key: string, fallback = false): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  );
  const setValue = useCallback(
    (next: boolean) => {
      memory.set(key, next);
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        // Not persisted; the in-memory value still applies for this visit.
      }
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [key],
  );
  return [value, setValue];
}
