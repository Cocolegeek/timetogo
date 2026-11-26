import type { NotificationKind, NotificationPrefs } from "@/types";

/** What the client tells /api/notify; the server reads the details itself (RLS) and words the message. */
export type NotifyEvent =
  | { event: "expense"; tripId: string; id: string }
  | { event: "planning"; tripId: string; id: string }
  | { event: "list_assign"; tripId: string; id: string; participantIds: string[] }
  | { event: "trip_added"; tripId: string; userIds: string[] }
  | { event: "trip_joined"; tripId: string }
  | { event: "friend_added"; userId: string }
  | { event: "test" };

export const NOTIFICATION_KINDS: { kind: NotificationKind; label: string; hint: string }[] = [
  { kind: "expense", label: "Dépenses", hint: "Une dépense te concerne, avec ta part" },
  { kind: "settlement", label: "Remboursements", hint: "Quelqu'un t'a remboursé" },
  { kind: "lists", label: "Listes", hint: "On compte sur toi pour quelque chose" },
  { kind: "social", label: "Bande et groupes", hint: "On t'ajoute à un groupe, un pote rejoint" },
  { kind: "planning", label: "Planning", hint: "Une étape est ajoutée au programme" },
];

/** Same defaults as get_push_targets(): everything on except planning. */
export function isKindEnabled(prefs: NotificationPrefs | null | undefined, kind: NotificationKind): boolean {
  return prefs?.[kind] ?? kind !== "planning";
}
