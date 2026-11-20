"use client";

import { useCallback } from "react";
import useSWR from "swr";

/**
 * Cached, deduplicated query (SWR). Same shape as a useState-based hook:
 * `set` updates the cache optimistically without refetching, `refetch`
 * revalidates. `loading` is true only when nothing is cached yet.
 */
export function useCachedQuery<T>(key: string | null, fetcher: () => Promise<T>, fallback: T) {
  const { data, isLoading, mutate } = useSWR<T>(key, fetcher);

  const set = useCallback(
    (update: T | ((prev: T) => T)) =>
      mutate(
        (current) =>
          typeof update === "function" ? (update as (prev: T) => T)(current ?? fallback) : update,
        { revalidate: false }
      ),
    [mutate, fallback]
  );

  const refetch = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return { data: data ?? fallback, loading: isLoading && data === undefined, set, refetch };
}
