"use client";

import { useSyncExternalStore } from "react";

// React re-reads the snapshot only when the store says it changed, so announce one change right after
// subscribing (which happens once hydration has committed). The client snapshot is then `true`.
function subscribeOnce(onChange: () => void) {
  const id = setTimeout(onChange, 0);
  return () => clearTimeout(id);
}

/**
 * False during server rendering and hydration, true afterwards. Use it before rendering data the
 * server can't have (like the signed-in user's name) inside a late-hydrating Suspense boundary,
 * where the client cache may already hold that data and would otherwise cause a hydration mismatch.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeOnce,
    () => true,
    () => false,
  );
}
