import { createClient } from "@/lib/supabase/client";
import { profileAvatar } from "@/lib/avatars";

/**
 * Copies the current user's avatar onto every participant they are linked to
 * (trip_members.participant_id), so the whole group sees it.
 */
export async function syncMyParticipantAvatars(): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return;

  const [{ data: profile }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("custom_avatar_url, avatar_url").eq("id", user.id).single(),
    supabase.from("trip_members").select("participant_id").eq("user_id", user.id).not("participant_id", "is", null),
  ]);
  const avatar = profileAvatar(profile ?? null);
  const ids = (members ?? []).map((m) => m.participant_id as string).filter(Boolean);
  if (!avatar || ids.length === 0) return;

  await supabase.from("participants").update({ avatar }).in("id", ids);
}
