"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const updateProfile = async (
    updates: { name?: string; custom_avatar_url?: string | null }
  ): Promise<void> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    setProfile(prev => prev ? { ...prev, ...updates } : prev);
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (error) await fetchProfile();
  };

  const signOut = async (): Promise<void> => {
    await createClient().auth.signOut();
    window.location.href = "/login";
  };

  return { profile, loading, refetch: fetchProfile, updateProfile, signOut };
}
