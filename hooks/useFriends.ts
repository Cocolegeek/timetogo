"use client";

import { useCachedQuery } from "@/hooks/useCachedQuery";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notifications/notify";
import type { Friend } from "@/types";

const NO_FRIENDS: Friend[] = [];

async function fetchFriends(): Promise<Friend[]> {
  const { data, error } = await createClient().rpc("get_my_friends");
  if (error) return [];
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    name: (r.name as string | null) ?? null,
    avatar: (r.avatar as string | null) ?? null,
    tripsInCommon: Number(r.trips_in_common ?? 0),
    lastTripName: (r.last_trip_name as string | null) ?? null,
    since: r.since as string,
  }));
}

async function fetchFriendCode(): Promise<string | null> {
  const { data, error } = await createClient().rpc("get_my_friend_code");
  return error ? null : ((data as string | null) ?? null);
}

export interface FriendPreview {
  id: string;
  name: string | null;
  avatar: string | null;
  is_me: boolean;
  already: boolean;
}

export async function previewFriend(code: string): Promise<FriendPreview | null> {
  const { data } = await createClient().rpc("get_friend_preview", { p_code: code });
  return (data as FriendPreview | null) ?? null;
}

/** People you travel with (auto) + people you added with their link. */
export function useFriends() {
  const { data: friends, loading, refetch, set } = useCachedQuery("friends", fetchFriends, NO_FRIENDS);
  const { data: code } = useCachedQuery<string | null>("friend-code", fetchFriendCode, null);

  const addByCode = async (raw: string) => {
    const { data, error } = await createClient().rpc("add_friend_by_code", { p_code: raw.trim() });
    if (error) throw error;
    const added = data as { id: string };
    notify({ event: "friend_added", userId: added.id });
    await refetch();
    return added;
  };

  const remove = async (id: string) => {
    set((list) => list.filter((f) => f.id !== id));
    const { error } = await createClient().rpc("remove_friend", { p_friend_id: id });
    if (error) await refetch();
  };

  return { friends, loading, code, refetch, addByCode, remove };
}

/** Adds friends to a trip as linked members; returns how many were added. */
export async function addFriendsToTrip(tripId: string, friends: { id: string; color: string }[]): Promise<number> {
  if (friends.length === 0) return 0;
  const { data, error } = await createClient().rpc("add_friends_to_trip", { p_trip_id: tripId, p_friends: friends });
  if (error) throw error;
  notify({ event: "trip_added", tripId, userIds: friends.map((f) => f.id) });
  return Number(data ?? 0);
}

export function friendInviteUrl(code: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/friends/add?code=${code}`;
}
