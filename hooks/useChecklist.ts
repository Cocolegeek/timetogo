"use client";

import { useCachedQuery } from "@/hooks/useCachedQuery";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notifications/notify";
import { enqueue, isOfflineError } from "@/lib/offline/outbox";
import type { ChecklistItem, ChecklistList } from "@/types";

function rowToItem(row: Record<string, unknown>): ChecklistItem {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    list: row.list as ChecklistList,
    title: row.title as string,
    note: (row.note as string | null) ?? null,
    assigneeIds: Array.isArray(row.assignee_ids) ? (row.assignee_ids as string[]) : [],
    done: !!row.done,
    position: Number(row.position ?? 0),
    createdAt: row.created_at as string,
  };
}

const NO_ITEMS: ChecklistItem[] = [];

export async function fetchChecklistRows(tripId: string): Promise<ChecklistItem[]> {
  const { data } = await createClient()
    .from("checklist_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("position")
    .order("created_at");
  return (data ?? []).map(rowToItem);
}

export function useChecklist(tripId: string) {
  const { data: items, loading, set, refetch } = useCachedQuery(
    tripId ? `checklist:${tripId}` : null,
    () => fetchChecklistRows(tripId),
    NO_ITEMS
  );

  const addItem = async (data: { list: ChecklistList; title: string; assigneeIds?: string[]; note?: string | null }) => {
    const position = items.filter((i) => i.list === data.list).reduce((m, i) => Math.max(m, i.position), 0) + 1;
    const { data: row, error } = await createClient()
      .from("checklist_items")
      .insert({
        trip_id: tripId,
        list: data.list,
        title: data.title.trim(),
        note: data.note ?? null,
        assignee_ids: data.assigneeIds ?? [],
        position,
      })
      .select()
      .single();
    if (error) throw error;
    const item = rowToItem(row);
    set((prev) => [...prev, item]);
    if (item.assigneeIds.length) notify({ event: "list_assign", tripId, id: item.id, participantIds: item.assigneeIds });
    return item;
  };

  const updateItem = async (id: string, patch: Partial<Pick<ChecklistItem, "title" | "note" | "assigneeIds" | "done" | "list">>) => {
    const before = items.find((i) => i.id === id);
    set((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const dbPatch = {
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.note !== undefined && { note: patch.note }),
      ...(patch.assigneeIds !== undefined && { assignee_ids: patch.assigneeIds }),
      ...(patch.done !== undefined && { done: patch.done }),
      ...(patch.list !== undefined && { list: patch.list }),
    };
    const { error } = await createClient().from("checklist_items").update(dbPatch).eq("id", id);
    if (error) {
      if (isOfflineError(error)) {
        enqueue({ kind: "update", table: "checklist_items", rowId: id, patch: dbPatch, cacheKey: `checklist:${tripId}` });
        return;
      }
      await refetch();
      throw error;
    }
    const added = (patch.assigneeIds ?? []).filter((p) => !before?.assigneeIds.includes(p));
    if (added.length) notify({ event: "list_assign", tripId, id, participantIds: added });
  };

  const deleteItem = async (id: string) => {
    set((prev) => prev.filter((i) => i.id !== id));
    const { error } = await createClient().from("checklist_items").delete().eq("id", id);
    if (error) await refetch();
  };

  return { items, loading, refetch, addItem, updateItem, deleteItem };
}
