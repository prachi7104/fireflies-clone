"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

import { DEFAULT_PREFERENCE, THEME_STORAGE_KEY, parsePreference, resolveTheme, type ThemePreference } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "themechange";

// Used only when localStorage is blocked (some private windows), so a choice still applies for this visit.
let memoryPreference: ThemePreference = DEFAULT_PREFERENCE;

function readPreference(): ThemePreference {
  try {
    return parsePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return memoryPreference;
  }
}

// One subscription covers every way the answer can change: this tab, another tab, or the OS setting.
function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The Light / Dark / System preference, and the theme it resolves to right now. */
export function useTheme() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => DEFAULT_PREFERENCE);
  const systemDark = useSyncExternalStore(subscribe, () => window.matchMedia(DARK_QUERY).matches, () => false);
  const resolved = resolveTheme(preference, systemDark);

  // Keep <html data-theme> in step, e.g. when "System" is chosen and the OS switches to dark.
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    memoryPreference = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not persisted across visits, but memoryPreference still applies it now.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { preference, resolved, setPreference };
}
