import type { NotifyEvent } from "./events";

/** Fire-and-forget: never blocks or breaks the action that triggered it. */
export function notify(payload: NotifyEvent): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => null);
  } catch {
    // ignore
  }
}
