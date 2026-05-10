"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryItem, ItineraryType } from "@/types";

function rowToItem(row: Record<string, unknown>): ItineraryItem {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    date: row.date as string,
    time: (row.time as string | null) ?? undefined,
    title: row.title as string,
    description: (row.description as string | null) ?? undefined,
    location: (row.location as string | null) ?? undefined,
    type: row.type as ItineraryType,
    durationMinutes: (row.duration_minutes as number | null) ?? undefined,
    participantIds: Array.isArray(row.participant_ids) ? (row.participant_ids as string[]) : [],
    createdAt: row.created_at as string,
  };
}

function sortItems(items: ItineraryItem[]): ItineraryItem[] {
  return [...items].sort((a, b) =>
    a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? "")
  );
}

export function useItinerary(tripId: string) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    const { data } = await supabase
      .from("itinerary_items")
      .select("*")
      .eq("trip_id", tripId)
      .order("date")
      .order("time", { nullsFirst: true });
    setItems((data ?? []).map(rowToItem));
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = async (
    data: Omit<ItineraryItem, "id" | "createdAt" | "tripId">
  ): Promise<void> => {
    const { data: row, error } = await createClient()
      .from("itinerary_items")
      .insert({
        trip_id: tripId,
        date: data.date,
        time: data.time ?? null,
        title: data.title,
        description: data.description ?? null,
        location: data.location ?? null,
        type: data.type,
        duration_minutes: data.durationMinutes ?? null,
        participant_ids: data.participantIds ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    setItems(prev => sortItems([...prev, rowToItem(row)]));
  };

  const updateItem = async (
    id: string,
    data: Partial<Omit<ItineraryItem, "id" | "createdAt" | "tripId">>
  ): Promise<void> => {
    const snapshot = items;
    setItems(is => is.map(i => i.id === id ? { ...i, ...data } : i));

    const { error } = await createClient().from("itinerary_items").update({
      ...(data.date !== undefined && { date: data.date }),
      ...(data.time !== undefined && { time: data.time ?? null }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.location !== undefined && { location: data.location ?? null }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.durationMinutes !== undefined && { duration_minutes: data.durationMinutes ?? null }),
      ...(data.participantIds !== undefined && { participant_ids: data.participantIds ?? [] }),
    }).eq("id", id);

    if (error) { setItems(snapshot); throw new Error(error.message); }
  };

  const deleteItem = async (id: string): Promise<void> => {
    const snapshot = items;
    setItems(is => is.filter(i => i.id !== id));
    const { error } = await createClient().from("itinerary_items").delete().eq("id", id);
    if (error) { setItems(snapshot); throw new Error(error.message); }
  };

  return { items, loading, refetch: fetchItems, addItem, updateItem, deleteItem };
}
