"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ItineraryItem, ItineraryType } from "@/types";

function rowToItem(row: Record<string, unknown>): ItineraryItem {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    date: row.date as string,
    time: row.time as string | undefined,
    title: row.title as string,
    description: row.description as string | undefined,
    location: row.location as string | undefined,
    type: row.type as ItineraryType,
    createdAt: row.created_at as string,
  };
}

export function useItinerary(tripId: string) {
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
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
    const supabase = createClient();
    await supabase.from("itinerary_items").insert({
      trip_id: tripId,
      date: data.date,
      time: data.time ?? null,
      title: data.title,
      description: data.description ?? null,
      location: data.location ?? null,
      type: data.type,
    });
    await fetchItems();
  };

  const deleteItem = async (id: string): Promise<void> => {
    const supabase = createClient();
    await supabase.from("itinerary_items").delete().eq("id", id);
    await fetchItems();
  };

  return { items, loading, refetch: fetchItems, addItem, deleteItem };
}
