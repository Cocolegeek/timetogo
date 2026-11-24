import { createClient } from "@/lib/supabase/client";
import type { AuthProvider } from "@/lib/auth/providers";

/**
 * Guest mode = Supabase anonymous sign-in. Upgrading = linking Google or Facebook
 * to the same user (no copy). If that account already exists, a one-time
 * transfer token lets it claim the guest's trips (see migration 021).
 */

const TOKEN_KEY = "voyou-guest-transfer";

function callbackUrl(path: string): string {
  return `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(path)}`;
}

export async function continueAsGuest(): Promise<{ error?: string }> {
  const { error } = await createClient().auth.signInAnonymously();
  return error ? { error: error.message } : {};
}

/** Asks the server for a one-time transfer token and keeps it for the "account already exists" merge. */
export async function rememberGuestTransfer(): Promise<{ error?: string }> {
  const { data: token, error } = await createClient().rpc("create_guest_transfer");
  if (error || !token) return { error: error?.message ?? "Transfert impossible" };
  try {
    localStorage.setItem(TOKEN_KEY, token as string);
  } catch {
    // Without storage we can still link; only the "account already exists" merge needs it.
  }
  return {};
}

/** Step 1 of the upgrade: remember a transfer token, then link the provider to this account. */
export async function startUpgrade(provider: AuthProvider): Promise<{ error?: string }> {
  const remembered = await rememberGuestTransfer();
  if (remembered.error) return remembered;
  const { error } = await createClient().auth.linkIdentity({
    provider,
    options: { redirectTo: callbackUrl(`/auth/link?provider=${provider}`) },
  });
  return error ? { error: error.message } : {};
}

/** The account already exists: sign in to it, then claim the guest data. */
export async function signInToExisting(provider: AuthProvider): Promise<void> {
  await createClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl(`/auth/link?provider=${provider}&step=claim`) },
  });
}

export async function signInWithProvider(provider: AuthProvider, redirectTo: string): Promise<void> {
  await createClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl(redirectTo) },
  });
}

export function hasPendingTransfer(): boolean {
  try {
    return !!localStorage.getItem(TOKEN_KEY);
  } catch {
    return false;
  }
}

/** Moves the guest's trips into the signed-in account. Idempotent per token. */
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

/** After linking, fill the profile with the provider's name / photo / email when missing. */
export async function syncProfileFromProvider(provider: AuthProvider): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const identity = user.identities?.find((i) => i.provider === provider)?.identity_data ?? user.user_metadata ?? {};
  const { data: profile } = await supabase.from("profiles").select("name, avatar_url, email").eq("id", user.id).single();
  const updates: Record<string, string> = {};
  const fullName = (identity.full_name ?? identity.name) as string | undefined;
  const photo = [identity.avatar_url, identity.picture].find((v): v is string => typeof v === "string" && v.length > 0);
  if (!profile?.name && fullName) updates.name = fullName;
  if (!profile?.avatar_url && photo) updates.avatar_url = photo;
  if (!profile?.email && (user.email || identity.email)) updates.email = (user.email ?? identity.email) as string;
  if (Object.keys(updates).length) await supabase.from("profiles").update(updates).eq("id", user.id);
}
