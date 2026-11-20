"use client";

import { SWRConfig, type Cache } from "swr";

const STORAGE_KEY = "voyou-cache-v1";
let persistedCache: Map<string, unknown> | null = null;

/**
 * SWR cache persisted in localStorage: screens open instantly with the last
 * known data, then revalidate in the background (stale-while-revalidate).
 * Saved when the page is hidden (tab switch, app backgrounded, close).
 */
function persistentProvider(): Cache {
  if (typeof window === "undefined") return new Map() as Cache;
  if (persistedCache) return persistedCache as Cache;
  let entries: [string, unknown][] = [];
  try {
    entries = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    entries = [];
  }
  const map = new Map<string, unknown>(entries);
  const save = () => {
    try {
      const keep = Array.from(map.entries()).filter(
        ([k, v]) => !k.startsWith("$") && (v as { data?: unknown })?.data !== undefined
      );
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(keep.map(([k, v]) => [k, { data: (v as { data: unknown }).data }]))
      );
    } catch {
      // quota / private mode: the in-memory cache still works for this session
    }
  };
  window.addEventListener("pagehide", save);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") save();
  });
  persistedCache = map;
  return map as Cache;
}

/** Forget every cached screen (sign-out, account switch, guest merge). */
export function clearDataCache() {
  persistedCache?.clear();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: persistentProvider,
        revalidateOnFocus: true,
        focusThrottleInterval: 5000,
        revalidateOnReconnect: true,
        dedupingInterval: 4000,
        errorRetryCount: 2,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
