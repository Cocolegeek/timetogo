"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/shared/Toaster";
import { haptic } from "@/lib/haptics";

const UNDO_MS = 5000;

/**
 * Swipe-to-delete with an undo window: the row disappears at once, the real
 * delete runs after 5 s unless "Annuler" is tapped. Pending deletes are
 * committed if the screen unmounts.
 */
export function useUndoableDelete(commit: (id: string) => Promise<void> | void) {
  const toast = useToast();
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const commitRef = useRef(commit);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const [id, timer] of map) {
        clearTimeout(timer);
        void commitRef.current(id);
      }
      map.clear();
    };
  }, []);

  const remove = useCallback(
    (id: string, label: string) => {
      haptic("light");
      setPending((s) => new Set(s).add(id));
      const timer = setTimeout(async () => {
        timers.current.delete(id);
        try {
          await commitRef.current(id);
        } finally {
          setPending((s) => {
            const next = new Set(s);
            next.delete(id);
            return next;
          });
        }
      }, UNDO_MS);
      timers.current.set(id, timer);
      toast({
        message: label,
        duration: UNDO_MS,
        action: {
          label: "Annuler",
          onClick: () => {
            clearTimeout(timers.current.get(id));
            timers.current.delete(id);
            setPending((s) => {
              const next = new Set(s);
              next.delete(id);
              return next;
            });
          },
        },
      });
    },
    [toast]
  );

  return { pending, remove };
}
