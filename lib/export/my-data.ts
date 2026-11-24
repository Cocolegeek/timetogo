import { createClient } from "@/lib/supabase/client";

/**
 * Droit d'accès / portabilité (RGPD) : tout ce que Voyou garde sur toi, en JSON.
 * Lu avec tes droits (RLS) : tu obtiens tes voyages et ce que tes voyages contiennent.
 */
export async function collectMyData(): Promise<Record<string, unknown>> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not signed in");

  const [profile, memberships] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("trip_members").select("*").eq("user_id", uid),
  ]);
  const tripIds = (memberships.data ?? []).map((m) => m.trip_id as string);

  const forTrips = async (table: string) =>
    tripIds.length === 0 ? [] : (await supabase.from(table).select("*").in("trip_id", tripIds)).data ?? [];

  const [trips, participants, expenses, itinerary, meals, checklist, recurring, activity] = await Promise.all([
    tripIds.length === 0 ? [] : (await supabase.from("trips").select("*").in("id", tripIds)).data ?? [],
    forTrips("participants"),
    forTrips("expenses"),
    forTrips("itinerary_items"),
    forTrips("meals"),
    forTrips("checklist_items"),
    forTrips("recurring_expenses"),
    forTrips("trip_activity"),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: { id: uid, email: auth.user?.email ?? null, isGuest: auth.user?.is_anonymous ?? false },
    profile: profile.data,
    memberships: memberships.data ?? [],
    trips,
    participants,
    expenses,
    recurringExpenses: recurring,
    itinerary,
    meals,
    lists: checklist,
    activity,
  };
}

/** Supprime les fichiers que tu as téléversés (photo de profil, icônes de voyage). Best effort. */
export async function deleteMyStoredFiles(): Promise<void> {
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  for (const bucket of ["profile-avatars", "trip-icons"]) {
    try {
      const { data: files } = await supabase.storage.from(bucket).list(uid);
      if (files?.length) await supabase.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
    } catch {
      // le bucket peut ne pas exister : la suppression du compte continue
    }
  }
}
