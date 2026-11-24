"use client";

import { useCachedQuery } from "@/hooks/useCachedQuery";
import { createClient } from "@/lib/supabase/client";
import type { ActivityEntry } from "@/types";

function rowToEntry(row: Record<string, unknown>): ActivityEntry {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    actorName: (row.actor_name as string | null) ?? null,
    entity: row.entity as ActivityEntry["entity"],
    action: row.action as ActivityEntry["action"],
    title: (row.title as string | null) ?? null,
    amount: row.amount === null || row.amount === undefined ? null : Number(row.amount),
    details: (row.details as ActivityEntry["details"]) ?? {},
    createdAt: row.created_at as string,
  };
}

const NO_ENTRIES: ActivityEntry[] = [];

export function useActivity(tripId: string, enabled = true) {
  const { data, loading, refetch } = useCachedQuery(
    tripId && enabled ? `activity:${tripId}` : null,
    async () => {
      const { data: rows } = await createClient()
        .from("trip_activity")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
        .limit(100);
      return (rows ?? []).map(rowToEntry);
    },
    NO_ENTRIES
  );
  return { entries: data, loading, refetch };
}
