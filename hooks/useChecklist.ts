"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChecklistItem, ChecklistCategory } from "@/types";

function rowToItem(row: Record<string, unknown>): ChecklistItem {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    text: row.text as string,
    category: row.category as ChecklistCategory,
    checked: row.checked as boolean,
    createdAt: row.created_at as string,
  };
}

export function useChecklist(tripId: string) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("trip_id", tripId)
      .order("created_at");
    setItems((data ?? []).map(rowToItem));
    setLoading(false);
  }, [tripId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const addItem = async (text: string, category: ChecklistCategory): Promise<void> => {
    const supabase = createClient();
    await supabase.from("checklist_items").insert({
      trip_id: tripId,
      text,
      category,
      checked: false,
    });
    await fetchItems();
  };

  const toggleItem = async (id: string): Promise<void> => {
    const supabase = createClient();
    const item = items.find((i) => i.id === id);
    if (!item) return;
    await supabase.from("checklist_items").update({ checked: !item.checked }).eq("id", id);
    await fetchItems();
  };

  const deleteItem = async (id: string): Promise<void> => {
    const supabase = createClient();
    await supabase.from("checklist_items").delete().eq("id", id);
    await fetchItems();
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;

  return {
    items,
    loading,
    refetch: fetchItems,
    addItem,
    toggleItem,
    deleteItem,
    checkedCount,
    totalCount,
  };
}
