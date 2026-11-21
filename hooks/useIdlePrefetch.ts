"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Warms the next screens once the current one is on screen and the main
 * thread is idle, so tab switches stay instant without competing with the
 * launch (data requests, JS) for the network.
 */
export function useIdlePrefetch(hrefs: string[], delayMs = 1200) {
  const router = useRouter();
  const key = hrefs.join("|");
  useEffect(() => {
    if (!key) return;
    let idle: number | undefined;
    const timer = window.setTimeout(() => {
      const run = () => key.split("|").forEach((href) => router.prefetch(href));
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(run, { timeout: 2000 });
      else run();
    }, delayMs);
    return () => {
      window.clearTimeout(timer);
      if (idle !== undefined && "cancelIdleCallback" in window) window.cancelIdleCallback(idle);
    };
  }, [key, delayMs, router]);
}
