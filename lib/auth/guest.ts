import { createClient } from "@/lib/supabase/client";

/**
 * Guest mode = Supabase anonymous sign-in. Upgrading = linking Google to the
 * same user (no copy). If the Google account already exists, a one-time
 * transfer token lets that account claim the guest's trips (see migration 021).
 */

const TOKEN_KEY = "voyou-guest-transfer";

function callbackUrl(path: string): string {
  return `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(path)}`;
}

export async function continueAsGuest(): Promise<{ error?: string }> {
  const { error } = await createClient().auth.signInAnonymously();
  return error ? { error: error.message } : {};
}

/** Step 1 of the upgrade: remember a transfer token, then link Google to this account. */
export async function startGoogleUpgrade(): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: token, error: tokenError } = await supabase.rpc("create_guest_transfer");
  if (tokenError || !token) return { error: tokenError?.message ?? "Transfert impossible" };
  try {
    localStorage.setItem(TOKEN_KEY, token as string);
  } catch {
    // Without storage we can still link; only the "account already exists" merge needs it.
  }
  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: { redirectTo: callbackUrl("/auth/link") },
  });
  return error ? { error: error.message } : {};
}

/** The Google account already exists: sign in to it, then claim the guest data. */
export async function signInToExistingGoogle(): Promise<void> {
  await createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl("/auth/link?step=claim") },
  });
}

export function hasPendingTransfer(): boolean {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false;
  }
}

/** Moves the guest's trips into the signed-in Google account. Idempotent per token. */
export async function claimGuestTransfer(): Promise<{ trips: number; merged: boolean }> {
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    token = null;
  }
  if (!token) return { trips: 0, merged: false };
  const { data, error } = await createClient().rpc("claim_guest_transfer", { p_token: token });
  if (error) throw error;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  return data as { trips: number; merged: boolean };
}

/** After linking, fill the profile with the Google name / photo / email when missing. */
export async function syncProfileFromGoogle(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const google = user.identities?.find((i) => i.provider === "google")?.identity_data ?? user.user_metadata ?? {};
  const { data: profile } = await supabase.from("profiles").select("name, avatar_url, email").eq("id", user.id).single();
  const updates: Record<string, string> = {};
  const fullName = (google.full_name ?? google.name) as string | undefined;
  if (!profile?.name && fullName) updates.name = fullName;
  if (!profile?.avatar_url && google.avatar_url) updates.avatar_url = google.avatar_url as string;
  if (!profile?.email && (user.email || google.email)) updates.email = (user.email ?? google.email) as string;
  if (Object.keys(updates).length) await supabase.from("profiles").update(updates).eq("id", user.id);
}
