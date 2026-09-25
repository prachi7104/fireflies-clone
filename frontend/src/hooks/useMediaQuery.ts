"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * True while the CSS media query matches. Used where a layout needs different components,
 * not just different styles, per screen size (so only one copy is mounted).
 * The server snapshot is `serverDefault` because the server can't know the screen size.
 */
export function useMediaQuery(query: string, serverDefault = true): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}
