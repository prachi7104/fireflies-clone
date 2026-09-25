"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const EMIT_EVERY_MS = 100; // re-render about 10 times a second; smooth enough for a seek bar

/**
 * A media clock without media: requestAnimationFrame advances the position by real elapsed time × speed.
 * There's no audio file for these transcripts, so this drives the player bar and the transcript sync.
 */
export function usePlaybackClock(durationMs: number, initialMs = 0) {
  const clamp = useCallback((ms: number) => Math.min(Math.max(0, ms), durationMs), [durationMs]);
  const [currentMs, setCurrentMs] = useState(() => Math.min(Math.max(0, initialMs), durationMs));
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRateState] = useState(1);

  const positionRef = useRef(currentMs);
  const rateRef = useRef(1);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    let previous: number | null = null;
    let lastEmitted = positionRef.current;

    const tick = (now: number) => {
      const elapsed = previous === null ? 0 : now - previous;
      previous = now;
      const next = Math.min(durationMs, positionRef.current + elapsed * rateRef.current);
      positionRef.current = next;
      if (Math.abs(next - lastEmitted) >= EMIT_EVERY_MS || next >= durationMs) {
        lastEmitted = next;
        setCurrentMs(next);
      }
      if (next >= durationMs) {
        setIsPlaying(false); // reached the end
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, durationMs]);

  const seek = useCallback(
    (ms: number) => {
      const next = clamp(ms);
      positionRef.current = next;
      setCurrentMs(next);
    },
    [clamp],
  );

  const play = useCallback(() => {
    if (positionRef.current >= durationMs) seek(0);
    setIsPlaying(true);
  }, [durationMs, seek]);

  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => (isPlaying ? pause() : play()), [isPlaying, pause, play]);
  const skip = useCallback((deltaMs: number) => seek(positionRef.current + deltaMs), [seek]);
  const setRate = useCallback((next: number) => {
    rateRef.current = next;
    setRateState(next);
  }, []);

  return { currentMs, isPlaying, rate, play, pause, toggle, seek, skip, setRate };
}

export type PlaybackClock = ReturnType<typeof usePlaybackClock>;
