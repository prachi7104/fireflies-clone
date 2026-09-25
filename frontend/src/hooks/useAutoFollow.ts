"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

/** Scroll the transcript container so the given line sits in the middle, without moving the page. */
export function scrollLineIntoView(container: HTMLElement | null, index: number, behavior: ScrollBehavior = "smooth") {
  const line = container?.querySelector<HTMLElement>(`[data-line-index="${index}"]`);
  if (!container || !line) return;
  const top = line.offsetTop - container.clientHeight / 2 + line.clientHeight / 2;
  container.scrollTo({ top: Math.max(0, top), behavior });
}

/**
 * Keeps the active transcript line in view while playing. Manual scrolling (wheel, touch, keys)
 * pauses following until the user resumes it, like YouTube's transcript panel.
 */
export function useAutoFollow(containerRef: RefObject<HTMLElement | null>, activeIndex: number) {
  const [following, setFollowing] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const stop = () => setFollowing(false);
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) stop();
    };
    container.addEventListener("wheel", stop, { passive: true });
    container.addEventListener("touchmove", stop, { passive: true });
    container.addEventListener("keydown", onKey);
    return () => {
      container.removeEventListener("wheel", stop);
      container.removeEventListener("touchmove", stop);
      container.removeEventListener("keydown", onKey);
    };
  }, [containerRef]);

  useEffect(() => {
    if (following && activeIndex >= 0) scrollLineIntoView(containerRef.current, activeIndex);
  }, [activeIndex, following, containerRef]);

  const resume = useCallback(() => setFollowing(true), []);
  const pause = useCallback(() => setFollowing(false), []);
  return { following, resume, pause };
}
