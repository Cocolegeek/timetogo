"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** « planning » : la ligne unique du Planning dans la feuille « + », la page propose ensuite étape ou trajet. */
export type QuickAddKind = "expense" | "step" | "journey" | "planning" | "meal" | "item";

const EVENT = "voyou:quick-add";

/** Ask the current screen to open a creation form (same-page quick add). */
export function dispatchQuickAdd(kind: QuickAddKind) {
  window.dispatchEvent(new CustomEvent<QuickAddKind>(EVENT, { detail: kind }));
}

/**
 * Lets a screen open its creation form from the global "+" button:
 * - arriving with `?new=<kind>` (from another tab) → the screen reads the param
 *   for its initial state, this hook removes it from the URL;
 * - already on the screen → `onTrigger` is called through a window event.
 */
export function useQuickAdd(onTrigger: (kind: QuickAddKind) => void): void {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handler = useRef(onTrigger);

  useEffect(() => {
    handler.current = onTrigger;
  }, [onTrigger]);

  useEffect(() => {
    if (searchParams.get("new")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const listener = (e: Event) => handler.current((e as CustomEvent<QuickAddKind>).detail);
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, []);
}
