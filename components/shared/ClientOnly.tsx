"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Renders `fallback` on the server and during hydration, then `children`.
 * Lets screens read the persisted data cache on first client render without
 * a hydration mismatch.
 */
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return <>{hydrated ? children : fallback}</>;
}
