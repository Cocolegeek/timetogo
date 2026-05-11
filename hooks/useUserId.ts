"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Tiny helper that exposes the current Supabase user id once available.
 * Returns `null` until the auth state is resolved.
 */
export function useUserId(): string | null {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setId(data.user?.id ?? null);
      });
    return () => { cancelled = true; };
  }, []);

  return id;
}
