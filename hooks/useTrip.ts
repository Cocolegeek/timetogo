"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { generateShareCode } from "@/lib/trip-share";
import { buildDefaultMealRows } from "@/lib/meals/slots";
import type { Trip, Participant } from "@/types";

function rowsToTrip(
  tripRow: Record<string, unknown>,
  participants: Participant[],
  isOwner: boolean,
  myParticipantId: string | null
): Trip {
  return {
    id: tripRow.id as string,
    name: tripRow.name as string,
    destination: tripRow.destination as string,
    emoji: tripRow.emoji as string,
    currency: tripRow.currency as string,
    startDate: tripRow.start_date as string,
    endDate: tripRow.end_date as string,
    totalBudget: tripRow.total_budget as number | undefined,
    shareCode: tripRow.share_code as string,
    isOwner,
    myParticipantId,
    participants,
    createdAt: tripRow.created_at as string,
    updatedAt: tripRow.updated_at as string,
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

  const createTrip = async (
    data: Pick<Trip, "name" | "destination" | "emoji" | "currency" | "startDate" | "endDate" | "totalBudget"> & { participants: Omit<Participant, "id">[] }
  ): Promise<string> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) throw new Error("Not authenticated");

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        name: data.name,
        destination: data.destination,
        emoji: data.emoji,
        currency: data.currency,
        start_date: data.startDate,
        end_date: data.endDate,
        total_budget: data.totalBudget ?? null,
        share_code: generateShareCode(),
        owner_id: user.id,
      })
      .select()
      .single();

    if (tripError || !trip) throw tripError;

    const { error: memberError } = await supabase.from("trip_members").insert({
      trip_id: trip.id, user_id: user.id, participant_id: null, role: "owner",
    });
    if (memberError) throw memberError;

    const { data: insertedParticipants, error: participantsError } = await supabase
      .from("participants")
      .insert(data.participants.map((p) => ({ trip_id: trip.id, name: p.name, color: p.color, avatar: p.avatar ?? null })))
      .select();
    if (participantsError) throw participantsError;

    const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
    const matched = insertedParticipants?.find(
      (p) => p.name.toLowerCase() === (profile?.name ?? "").toLowerCase()
    );
    if (matched) {
      await supabase.from("trip_members").update({ participant_id: matched.id })
        .eq("trip_id", trip.id).eq("user_id", user.id);
    }

    const mealRows = buildDefaultMealRows(trip.id, data.startDate, data.endDate);
    if (mealRows.length > 0) await supabase.from("meals").insert(mealRows);

    await fetchTrips();
    return trip.id;
  };

  const deleteTrip = async (id: string): Promise<void> => {
    const snapshot = trips;
    setTrips(ts => ts.filter(t => t.id !== id));
    const { error } = await createClient().from("trips").delete().eq("id", id);
    if (error) { setTrips(snapshot); throw error; }
  };

  return { trips, loading, refetch: fetchTrips, createTrip, deleteTrip };
}

export function useTrip(id: string) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  const updateTrip = async (
    data: Partial<{ name: string; destination: string; emoji: string; currency: string; startDate: string; endDate: string; totalBudget: number | null }>
  ): Promise<void> => {
    const snapshot = trip;
    if (trip) setTrip({ ...trip, ...data, totalBudget: data.totalBudget ?? undefined });

    const { error } = await createClient().from("trips").update({
      ...(data.name && { name: data.name }),
      ...(data.destination && { destination: data.destination }),
      ...(data.emoji && { emoji: data.emoji }),
      ...(data.currency && { currency: data.currency }),
      ...(data.startDate && { start_date: data.startDate }),
      ...(data.endDate && { end_date: data.endDate }),
      ...(data.totalBudget !== undefined && { total_budget: data.totalBudget }),
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    if (error) { setTrip(snapshot); throw error; }
  };

  const setMyParticipant = async (participantId: string): Promise<void> => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;
    await supabase.from("trip_members").update({ participant_id: participantId })
      .eq("trip_id", id).eq("user_id", user.id);
    await fetchTrip();
  };

  const addParticipant = async (data: { name: string; color: string }): Promise<void> => {
    await createClient().from("participants").insert({ trip_id: id, name: data.name, color: data.color });
    await fetchTrip();
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

  return { trip, loading, refetch: fetchTrip, updateTrip, setMyParticipant, addParticipant, updateParticipant, deleteParticipant };
}
