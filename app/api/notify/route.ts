import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { VAPID_PUBLIC_KEY } from "@/lib/notifications/vapid";
import { formatCurrency } from "@/lib/format-currency";
import type { NotifyEvent } from "@/lib/notifications/events";
import type { NotificationKind } from "@/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface Message {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  url: string;
  tag: string;
}

interface SplitRow {
  participantId: string;
  excluded?: boolean;
  share?: number;
}

const configured = () => !!process.env.VAPID_PRIVATE_KEY;

/** Lets Réglages › Notifications say whether the server can send at all. */
export async function GET() {
  return NextResponse.json({ configured: configured() });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!configured()) return NextResponse.json({ sent: 0, configured: false });

  let payload: NotifyEvent;
  try {
    payload = (await request.json()) as NotifyEvent;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || (origin.startsWith("https://") ? origin : "mailto:notifications@voyou.app"),
    VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY!
  );

  try {
    if (payload.event === "test") return NextResponse.json({ sent: await sendTest(supabase, user.id) });
    const messages = await compose(supabase, user.id, payload);
    if (messages === null) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ sent: await deliver(supabase, messages) });
  } catch (err) {
    console.error("[notify]", err);
    return NextResponse.json({ sent: 0 }, { status: 500 });
  }
}

// ─── Wording ──────────────────────────────────────────────────────────────────

async function compose(supabase: Supabase, me: string, p: NotifyEvent): Promise<Message[] | null> {
  if (p.event === "friend_added") {
    const name = await myName(supabase, me);
    return [{ userId: p.userId, kind: "social", title: "Voyou", body: `${name} t'a ajouté à sa bande`, url: "/settings/friends", tag: `friend-${me}` }];
  }
  if (p.event === "test") return [];

  // Everything else happens inside a trip: RLS only shows it to members.
  const [{ data: trip }, { data: members }, { data: participants }] = await Promise.all([
    supabase.from("trips").select("id, name, currency").eq("id", p.tripId).single(),
    supabase.from("trip_members").select("user_id, participant_id").eq("trip_id", p.tripId),
    supabase.from("participants").select("id, name").eq("trip_id", p.tripId),
  ]);
  if (!trip || !members?.some((m) => m.user_id === me)) return null;

  const userOf = (participantId: string) => members.find((m) => m.participant_id === participantId)?.user_id;
  const myParticipant = members.find((m) => m.user_id === me)?.participant_id;
  const sender = participants?.find((x) => x.id === myParticipant)?.name ?? (await myName(supabase, me));
  const others = members.map((m) => m.user_id).filter((id) => id !== me);
  const base = `/trips/${trip.id}`;
  const money = (n: number) => formatCurrency(n, trip.currency);

  switch (p.event) {
    case "expense": {
      const { data: e } = await supabase
        .from("expenses")
        .select("title, amount_in_trip_currency, category, payers, splits")
        .eq("id", p.id)
        .eq("trip_id", trip.id)
        .single();
      if (!e) return [];
      const splits = ((e.splits as SplitRow[] | null) ?? []).filter((s) => !s.excluded);
      if (e.category === "reimbursement") {
        return splits
          .map((s) => userOf(s.participantId))
          .filter((id): id is string => !!id && id !== me)
          .map((userId) => ({
            userId,
            kind: "settlement" as const,
            title: trip.name,
            body: `${sender} t'a remboursé ${money(e.amount_in_trip_currency)}`,
            url: `${base}/budget?tab=balances`,
            tag: `expense-${p.id}`,
          }));
      }
      const concerned = new Set<string>([
        ...((e.payers as { participantId: string }[] | null) ?? []).map((x) => x.participantId),
        ...splits.map((s) => s.participantId),
      ]);
      const out: Message[] = [];
      for (const participantId of concerned) {
        const userId = userOf(participantId);
        if (!userId || userId === me || out.some((m) => m.userId === userId)) continue;
        const share = splits.find((s) => s.participantId === participantId)?.share;
        out.push({
          userId,
          kind: "expense",
          title: trip.name,
          body: `${sender} a ajouté « ${e.title} » · ${money(e.amount_in_trip_currency)}${share ? ` — ta part ${money(share)}` : ""}`,
          url: `${base}/budget?expense=${p.id}`,
          tag: `expense-${p.id}`,
        });
      }
      return out;
    }
    case "planning": {
      const { data: item } = await supabase
        .from("itinerary_items")
        .select("title, date, time")
        .eq("id", p.id)
        .eq("trip_id", trip.id)
        .single();
      if (!item) return [];
      const day = new Date(`${item.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
      const when = `${day}${item.time ? ` à ${String(item.time).slice(0, 5)}` : ""}`;
      return others.map((userId) => ({
        userId,
        kind: "planning" as const,
        title: trip.name,
        body: `${sender} a ajouté « ${item.title} » · ${when}`,
        url: `${base}/planning?date=${item.date}&item=${p.id}`,
        tag: `planning-${p.id}`,
      }));
    }
    case "list_assign": {
      const { data: item } = await supabase
        .from("checklist_items")
        .select("title")
        .eq("id", p.id)
        .eq("trip_id", trip.id)
        .single();
      if (!item) return [];
      return p.participantIds
        .map(userOf)
        .filter((id): id is string => !!id && id !== me)
        .map((userId) => ({
          userId,
          kind: "lists" as const,
          title: trip.name,
          body: `${sender} compte sur toi : « ${item.title} »`,
          url: `${base}/lists?item=${p.id}`,
          tag: `list-${p.id}`,
        }));
    }
    case "trip_added":
      return p.userIds
        .filter((id) => id !== me && members.some((m) => m.user_id === id))
        .map((userId) => ({
          userId,
          kind: "social" as const,
          title: trip.name,
          body: `${sender} t'a ajouté au voyage. Tout est déjà là.`,
          url: base,
          tag: `trip-${trip.id}`,
        }));
    case "trip_joined":
      return others.map((userId) => ({
        userId,
        kind: "social" as const,
        title: trip.name,
        body: `${sender} a rejoint le voyage`,
        url: base,
        tag: `join-${trip.id}-${me}`,
      }));
  }
}

async function myName(supabase: Supabase, me: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("name").eq("id", me).single();
  return data?.name?.split(" ")[0] || "Un pote";
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

async function deliver(supabase: Supabase, messages: Message[]): Promise<number> {
  let sent = 0;
  const byKind = new Map<NotificationKind, Message[]>();
  for (const m of messages) byKind.set(m.kind, [...(byKind.get(m.kind) ?? []), m]);

  for (const [kind, list] of byKind) {
    const { data: targets } = await supabase.rpc("get_push_targets", {
      p_user_ids: [...new Set(list.map((m) => m.userId))],
      p_kind: kind,
    });
    for (const t of (targets ?? []) as { user_id: string; endpoint: string; p256dh: string; auth: string }[]) {
      const message = list.find((m) => m.userId === t.user_id);
      if (message && (await push(supabase, t, message))) sent++;
    }
  }
  return sent;
}

async function sendTest(supabase: Supabase, me: string): Promise<number> {
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", me);
  let sent = 0;
  for (const s of subs ?? []) {
    const ok = await push(supabase, s, {
      userId: me,
      kind: "social",
      title: "Voyou",
      body: "Les notifications marchent sur cet appareil.",
      url: "/settings/notifications",
      tag: "test",
    });
    if (ok) sent++;
  }
  return sent;
}

async function push(
  supabase: Supabase,
  sub: { endpoint: string; p256dh: string; auth: string },
  m: Message
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title: m.title, body: m.body, url: m.url, tag: m.tag }),
      { TTL: 60 * 60 * 12, urgency: m.kind === "planning" ? "low" : "normal" }
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) await supabase.rpc("prune_push_subscription", { p_endpoint: sub.endpoint });
    return false;
  }
}
