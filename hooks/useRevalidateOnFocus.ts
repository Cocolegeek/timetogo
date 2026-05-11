"use client";

import { useEffect, useRef } from "react";

/**
 * Refetches the given function whenever the tab becomes visible again
 * (e.g. user switched back from another app or another tab).
 *
 * Throttled to avoid hammering on rapid visibility flips: a minimum of 5s
 * between refetches.
 */
export function useRevalidateOnFocus(refetch: () => void | Promise<void>) {
  const lastFetchRef = useRef<number>(Date.now());

  useEffect(() => {
    const MIN_INTERVAL = 5_000;

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastFetchRef.current < MIN_INTERVAL) return;
      lastFetchRef.current = now;
      void refetch();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refetch]);
}
