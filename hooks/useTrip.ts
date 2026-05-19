"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateShareCode } from "@/lib/trip-share";
import { buildDefaultMealRows } from "@/lib/meals/slots";
import { useRevalidateOnFocus } from "@/hooks/useRevalidateOnFocus";
import type { Trip, TripType, Participant } from "@/types";

function rowsToTrip(
  tripRow: Record<string, unknown>,
  participants: Participant[],
  isOwner: boolean,
  myParticipantId: string | null
): Trip {
  const type = ((tripRow.type as TripType | undefined) ?? "trip") as TripType;
  const base = {
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
  };

  if (type === "group") {
    const startDate = (tripRow.start_date as string | null) ?? undefined;
    const endDate = (tripRow.end_date as string | null) ?? undefined;
    return { ...base, type: "group", startDate, endDate };
  }
  return {
    ...base,
    type: "trip",
    destination: (tripRow.destination as string | null) ?? "",
    startDate: (tripRow.start_date as string | null) ?? "",
    endDate: (tripRow.end_date as string | null) ?? "",
  };
}

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }

    const { data: members } = await supabase
      .from("trip_members")
      .select("trip_id, role, participant_id")
      .eq("user_id", user.id);

    if (!members?.length) { setTrips([]); setLoading(false); return; }

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

    setTrips(
      (tripsRes.data ?? []).map((t) => {
        const member = memberMap[t.id];
        return rowsToTrip(t, participantsByTrip[t.id] ?? [], member?.role === "owner", member?.participant_id ?? null);
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useRevalidateOnFocus(fetchTrips);

  const createTrip = async (
    data: {
      type: TripType;
      name: string;
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
      p_type: data.type,
      p_destination: data.type === "trip" ? (data.destination ?? null) : null,
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

    if (data.type === "trip" && data.startDate && data.endDate) {
      const mealRows = buildDefaultMealRows(tripId as string, data.startDate, data.endDate);
      if (mealRows.length > 0) await supabase.from("meals").insert(mealRows);
    }

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

export function useTrip(id: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [claims, setClaims] = useState<ParticipantClaim[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_trip_member_claims", {
      p_trip_id: id,
    });
    if (error || !data) return;
    setClaims(
      (data as Array<Record<string, unknown>>).map((r) => ({
        participantId: r.participant_id as string,
        userId: r.user_id as string,
        userName: (r.user_name as string | null) ?? null,
        isPrimary: r.is_primary as boolean,
      }))
    );
  }, [id]);

  const fetchTrip = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }

    const [tripRes, participantsRes, memberRes] = await Promise.all([
      supabase.from("trips").select("*").eq("id", id).single(),
      supabase.from("participants").select("*").eq("trip_id", id).order("created_at"),
      supabase.from("trip_members").select("*").eq("trip_id", id).eq("user_id", user.id).single(),
    ]);

    if (!tripRes.data) { setLoading(false); return; }

    const participants: Participant[] = (participantsRes.data ?? []).map((p) => ({
      id: p.id, name: p.name, color: p.color, avatar: p.avatar ?? undefined,
    }));

    setTrip(rowsToTrip(tripRes.data, participants, memberRes.data?.role === "owner", memberRes.data?.participant_id ?? null));
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTrip(); fetchClaims(); }, [fetchTrip, fetchClaims]);
  useRevalidateOnFocus(fetchTrip);

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
    }>
  ): Promise<void> => {
    const snapshot = trip;
    if (trip) {
      const sharedPatch = {
        ...(data.name && { name: data.name }),
        ...(data.emoji && { emoji: data.emoji }),
        ...(data.currency && { currency: data.currency }),
        ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl }),
        totalBudget: data.totalBudget ?? trip.totalBudget,
      };
      const datePatch = {
        ...(data.startDate !== undefined && { startDate: data.startDate ?? undefined }),
        ...(data.endDate !== undefined && { endDate: data.endDate ?? undefined }),
      };
      const next: Trip = trip.type === "trip"
        ? {
            ...trip,
            ...sharedPatch,
            ...(data.destination !== undefined && { destination: data.destination }),
            ...datePatch,
          }
        : { ...trip, ...sharedPatch, ...datePatch };
      setTrip(next);
    }

    const { error } = await createClient().from("trips").update({
      ...(data.name && { name: data.name }),
      ...(data.destination !== undefined && { destination: data.destination }),
      ...(data.emoji && { emoji: data.emoji }),
      ...(data.currency && { currency: data.currency }),
      ...(data.startDate !== undefined && { start_date: data.startDate }),
      ...(data.endDate !== undefined && { end_date: data.endDate }),
      ...(data.totalBudget !== undefined && { total_budget: data.totalBudget }),
      ...(data.iconUrl !== undefined && { icon_url: data.iconUrl }),
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
