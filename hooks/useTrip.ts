"use client";

import { useSWRConfig } from "swr";
import { createClient } from "@/lib/supabase/client";
import { generateShareCode } from "@/lib/trip-share";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { syncMyParticipantAvatars } from "@/lib/avatar-sync";
import { parseModules } from "@/lib/trip-features";
import type { Trip, TripModule, Participant } from "@/types";

function rowsToTrip(
  tripRow: Record<string, unknown>,
  participants: Participant[],
  isOwner: boolean,
  myParticipantId: string | null
): Trip {
  return {
    id: tripRow.id as string,
    name: tripRow.name as string,
    emoji: tripRow.emoji as string,
    iconUrl: (tripRow.icon_url as string | null) ?? null,
    currency: tripRow.currency as string,
    totalBudget: (tripRow.total_budget as number | null) ?? undefined,
    shareCode: tripRow.share_code as string,
    isOwner,
    myParticipantId,
    participants,
    createdAt: tripRow.created_at as string,
    updatedAt: tripRow.updated_at as string,
    modules: parseModules(tripRow.modules, tripRow.type as string | undefined),
    mealsInPlanning: tripRow.meals_in_planning !== false,
    destination: (tripRow.destination as string | null) || undefined,
    startDate: (tripRow.start_date as string | null) || undefined,
    endDate: (tripRow.end_date as string | null) || undefined,
  };
}

const NO_TRIPS: Trip[] = [];
const NO_CLAIMS: ParticipantClaim[] = [];

async function fetchTripList(): Promise<Trip[]> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return [];

    // One round trip: memberships with their trip and its participants embedded.
    const { data: rows, error: embedError } = await supabase
      .from("trip_members")
      .select("role, participant_id, trip:trips(*, participants(*))")
      .eq("user_id", user.id);

    if (!embedError && rows) {
      type Row = { role: string; participant_id: string | null; trip: (Record<string, unknown> & { participants?: Record<string, unknown>[] }) | null };
      return (rows as unknown as Row[])
        .filter((r) => r.trip)
        .sort((a, b) => String(b.trip!.created_at).localeCompare(String(a.trip!.created_at)))
        .map((r) => {
          const participants = [...(r.trip!.participants ?? [])]
            .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))
            .map((p) => ({ id: p.id as string, name: p.name as string, color: p.color as string, avatar: (p.avatar as string | null) ?? undefined }));
          return rowsToTrip(r.trip!, participants, r.role === "owner", r.participant_id ?? null);
        });
    }

    const { data: members } = await supabase
      .from("trip_members")
      .select("trip_id, role, participant_id")
      .eq("user_id", user.id);

    if (!members?.length) return [];

    const tripIds = members.map((m) => m.trip_id);

    const [tripsRes, participantsRes] = await Promise.all([
      supabase.from("trips").select("*").in("id", tripIds).order("created_at", { ascending: false }),
      supabase.from("participants").select("*").in("trip_id", tripIds).order("created_at"),
    ]);

    const participantsByTrip = (participantsRes.data ?? []).reduce<Record<string, Participant[]>>(
      (acc, p) => {
        if (!acc[p.trip_id]) acc[p.trip_id] = [];
        acc[p.trip_id].push({ id: p.id, name: p.name, color: p.color, avatar: p.avatar });
        return acc;
      }, {}
    );

    const memberMap = Object.fromEntries(members.map((m) => [m.trip_id, m]));

    return (tripsRes.data ?? []).map((t) => {
      const member = memberMap[t.id];
      return rowsToTrip(t, participantsByTrip[t.id] ?? [], member?.role === "owner", member?.participant_id ?? null);
    });
}

export function useTrips() {
  const { mutate: cacheMutate } = useSWRConfig();
  const { data: trips, loading, set: setTrips, refetch: fetchTrips } = useCachedQuery(
    "trips",
    async () => {
      const list = await fetchTripList();
      // Seed each trip's own cache: opening a trip from the list is instant.
      for (const t of list) void cacheMutate(`trip:${t.id}`, t, { revalidate: false });
      return list;
    },
    NO_TRIPS
  );

  const createTrip = async (
    data: {
      name: string;
      modules?: TripModule[];
      emoji: string;
      currency: string;
      destination?: string;
      startDate?: string;
      endDate?: string;
      totalBudget?: number;
      participants: Omit<Participant, "id">[];
    }
  ): Promise<string> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Not authenticated");

    const { data: tripId, error: rpcError } = await supabase.rpc("create_trip_with_owner", {
      p_name: data.name,
      p_type: "trip",
      p_destination: data.destination ?? null,
      p_emoji: data.emoji,
      p_currency: data.currency,
      p_start_date: data.startDate ?? null,
      p_end_date: data.endDate ?? null,
      p_total_budget: data.totalBudget ?? null,
      p_share_code: generateShareCode(),
      p_participants: data.participants.map((p) => ({
        name: p.name,
        color: p.color,
        avatar: p.avatar ?? null,
      })),
    });

    if (rpcError || !tripId) throw rpcError ?? new Error("Trip creation failed");

    const modules = data.modules ?? [];
    if (modules.length > 0) {
      const { error: modulesError } = await supabase.from("trips").update({ modules }).eq("id", tripId as string);
      if (modulesError) console.error("[create-trip] modules", modulesError);
    }

    await syncMyParticipantAvatars();
    await fetchTrips();
    return tripId as string;
  };

  const deleteTrip = async (id: string): Promise<void> => {
    const snapshot = trips;
    setTrips(ts => ts.filter(t => t.id !== id));
    const { error } = await createClient().from("trips").delete().eq("id", id);
    if (error) { setTrips(snapshot); throw error; }
  };

  return { trips, loading, refetch: fetchTrips, createTrip, deleteTrip };
}

export interface ParticipantClaim {
  participantId: string;
  userId: string;
  userName: string | null;
  isPrimary: boolean;
}

async function fetchClaimRows(id: string): Promise<ParticipantClaim[]> {
    const { data, error } = await createClient().rpc("get_trip_member_claims", {
      p_trip_id: id,
    });
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map((r) => ({
      participantId: r.participant_id as string,
      userId: r.user_id as string,
      userName: (r.user_name as string | null) ?? null,
      isPrimary: r.is_primary as boolean,
    }));
}

export async function fetchTripDetail(id: string): Promise<Trip | null> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    const [tripRes, participantsRes, memberRes] = await Promise.all([
      supabase.from("trips").select("*").eq("id", id).single(),
      supabase.from("participants").select("*").eq("trip_id", id).order("created_at"),
      supabase.from("trip_members").select("*").eq("trip_id", id).eq("user_id", user.id).single(),
    ]);

    if (!tripRes.data) return null;

    const participants: Participant[] = (participantsRes.data ?? []).map((p) => ({
      id: p.id, name: p.name, color: p.color, avatar: p.avatar ?? undefined,
    }));

    return rowsToTrip(tripRes.data, participants, memberRes.data?.role === "owner", memberRes.data?.participant_id ?? null);
}

export function useTrip(id: string) {
  const { data: trip, loading, set: setTrip, refetch: fetchTrip } = useCachedQuery<Trip | null>(
    id ? `trip:${id}` : null,
    () => fetchTripDetail(id),
    null
  );
  const { data: claims, refetch: fetchClaims } = useCachedQuery(
    id ? `claims:${id}` : null,
    () => fetchClaimRows(id),
    NO_CLAIMS
  );

  const updateTrip = async (
    data: Partial<{
      name: string;
      destination: string;
      emoji: string;
      currency: string;
      startDate: string | null;
      endDate: string | null;
      totalBudget: number | null;
      iconUrl: string | null;
      modules: TripModule[];
      mealsInPlanning: boolean;
    }>
  ): Promise<void> => {
    const snapshot = trip;
    if (trip) {
      const sharedPatch = {
        ...(data.name && { name: data.name }),
        ...(data.emoji !== undefined && { emoji: data.emoji }),
        ...(data.currency && { currency: data.currency }),
        ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl }),
        totalBudget: data.totalBudget ?? trip.totalBudget,
      };
      const datePatch = {
        ...(data.startDate !== undefined && { startDate: data.startDate ?? undefined }),
        ...(data.endDate !== undefined && { endDate: data.endDate ?? undefined }),
      };
      const next: Trip = {
        ...trip,
        ...sharedPatch,
        ...(data.destination !== undefined && { destination: data.destination || undefined }),
        ...(data.modules && { modules: data.modules }),
        ...(data.mealsInPlanning !== undefined && { mealsInPlanning: data.mealsInPlanning }),
        ...datePatch,
      };
      setTrip(next);
    }

    const { error } = await createClient().from("trips").update({
      ...(data.name && { name: data.name }),
      ...(data.destination !== undefined && { destination: data.destination }),
      ...(data.emoji !== undefined && { emoji: data.emoji }),
      ...(data.currency && { currency: data.currency }),
      ...(data.startDate !== undefined && { start_date: data.startDate }),
      ...(data.endDate !== undefined && { end_date: data.endDate }),
      ...(data.totalBudget !== undefined && { total_budget: data.totalBudget }),
      ...(data.iconUrl !== undefined && { icon_url: data.iconUrl }),
      ...(data.modules && { modules: data.modules }),
      ...(data.mealsInPlanning !== undefined && { meals_in_planning: data.mealsInPlanning }),
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) { setTrip(snapshot); throw error; }
  };

  const setMyParticipant = async (participantId: string): Promise<void> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { error } = await supabase.rpc("claim_participant", {
      p_trip_id: id,
      p_participant_id: participantId,
    });
    if (error) throw error;
    await syncMyParticipantAvatars();
    await Promise.all([fetchTrip(), fetchClaims()]);
  };

  const addParticipant = async (data: { name: string; color: string }): Promise<Participant> => {
    const { data: row, error } = await createClient()
      .from("participants")
      .insert({ trip_id: id, name: data.name, color: data.color })
      .select()
      .single();
    if (error || !row) throw error ?? new Error("Failed to create participant");
    await fetchTrip();
    return {
      id: row.id as string,
      name: row.name as string,
      color: row.color as string,
      avatar: (row.avatar as string | null) ?? undefined,
    };
  };

  const updateParticipant = async (participantId: string, data: { name?: string; color?: string }): Promise<void> => {
    await createClient().from("participants").update({
      ...(data.name && { name: data.name }),
      ...(data.color && { color: data.color }),
    }).eq("id", participantId);
    await fetchTrip();
  };

  const deleteParticipant = async (participantId: string): Promise<void> => {
    await createClient().from("participants").delete().eq("id", participantId);
    await fetchTrip();
  };

  return { trip, claims, loading, refetch: fetchTrip, refetchClaims: fetchClaims, updateTrip, setMyParticipant, addParticipant, updateParticipant, deleteParticipant };
}
