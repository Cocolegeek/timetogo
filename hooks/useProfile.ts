"use client";

import { useCachedQuery } from "@/hooks/useCachedQuery";
import { clearDataCache } from "@/lib/data/swr";
import { createClient } from "@/lib/supabase/client";
import { syncMyParticipantAvatars } from "@/lib/avatar-sync";
import type { NotificationPrefs, Profile } from "@/types";

async function fetchProfileRow(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile | null) ?? null;
}

export function useProfile() {
  const { data: profile, loading, set: setProfile, refetch: fetchProfile } = useCachedQuery<Profile | null>(
    "profile",
    fetchProfileRow,
    null
  );

  const updateProfile = async (
    updates: {
      name?: string;
      custom_avatar_url?: string | null;
      iban?: string | null;
      phone?: string | null;
      notification_prefs?: NotificationPrefs;
    }
  ): Promise<void> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    setProfile(prev => prev ? { ...prev, ...updates } : prev);
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (error) {
      await fetchProfile();
      return;
    }
    if (updates.custom_avatar_url !== undefined) await syncMyParticipantAvatars();
  };

  const signOut = async (): Promise<void> => {
    clearDataCache();
    await createClient().auth.signOut();
    window.location.href = "/login";
  };

  return { profile, loading, refetch: fetchProfile, updateProfile, signOut };
}
