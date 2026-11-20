"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Current auth user, kept in sync with sign-in / link / sign-out. */
export function useAuthUser() {
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({ user: null, loading: true });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setState({ user: data.session?.user ?? null, loading: false }));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, loading: false });
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { user: state.user, loading: state.loading, isAnonymous: !!state.user?.is_anonymous };
}
