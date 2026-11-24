import { createClient } from "@/lib/supabase/client";
import { notify } from "@/lib/notifications/notify";
import type { NotifyEvent } from "@/lib/notifications/events";

/**
 * File d'attente des modifications faites sans réseau. Persistée dans
 * localStorage, rejouée dans l'ordre au retour de la connexion.
 * - insert : upsert sur l'id généré côté client → rejouer deux fois ne duplique rien.
 * - update / delete d'une ligne encore en attente : fusionnés dans l'insert (rien à envoyer de plus).
 */
export type OutboxOp =
  | { id: string; kind: "insert"; table: string; rowId: string; row: Record<string, unknown>; cacheKey: string; after?: NotifyEvent }
  | { id: string; kind: "update"; table: string; rowId: string; patch: Record<string, unknown>; cacheKey: string }
  | { id: string; kind: "delete"; table: string; rowId: string; cacheKey: string };

const KEY = "voyou-outbox-v1";
const EMPTY: OutboxOp[] = [];

let ops: OutboxOp[] | null = null;
const listeners = new Set<() => void>();

function load(): OutboxOp[] {
  if (ops) return ops;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    ops = raw ? (JSON.parse(raw) as OutboxOp[]) : [];
  } catch {
    ops = [];
  }
  return ops;
}

function commit(next: OutboxOp[]) {
  ops = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota / mode privé : la file reste en mémoire pour cette session
  }
  listeners.forEach((l) => l());
}

export function subscribeOutbox(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOutbox(): OutboxOp[] {
  return load();
}

export function getServerOutbox(): OutboxOp[] {
  return EMPTY;
}

export function isPendingRow(rowId: string): boolean {
  return load().some((o) => o.rowId === rowId && o.kind === "insert");
}

export function newRowId(): string {
  return crypto.randomUUID();
}

/** Vrai pour une coupure réseau, faux pour une vraie erreur serveur (RLS, contrainte…). */
export function isOfflineError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = String((err as { message?: string } | null)?.message ?? err ?? "");
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout/i.test(msg);
}

type NewOp = OutboxOp extends infer O ? (O extends OutboxOp ? Omit<O, "id"> : never) : never;

export function enqueue(op: NewOp): void {
  const current = load();
  const full = { ...op, id: crypto.randomUUID() } as OutboxOp;
  const pendingInsert = current.find((o) => o.kind === "insert" && o.table === full.table && o.rowId === full.rowId);

  if (full.kind === "update" && pendingInsert && pendingInsert.kind === "insert") {
    commit(current.map((o) => (o === pendingInsert ? { ...pendingInsert, row: { ...pendingInsert.row, ...full.patch } } : o)));
    return;
  }
  if (full.kind === "delete") {
    const rest = current.filter((o) => !(o.table === full.table && o.rowId === full.rowId));
    commit(pendingInsert ? rest : [...rest, full]);
    return;
  }
  commit([...current, full]);
}

let flushing: Promise<FlushResult> | null = null;

export interface FlushResult {
  sent: number;
  dropped: number;
  cacheKeys: string[];
}

/** Rejoue la file. S'arrête à la première coupure réseau ; une erreur définitive écarte l'opération. */
export function flushOutbox(): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = (async () => {
    const result: FlushResult = { sent: 0, dropped: 0, cacheKeys: [] };
    const supabase = createClient();
    for (const op of [...load()]) {
      let error: unknown = null;
      try {
        if (op.kind === "insert") {
          ({ error } = await supabase.from(op.table).upsert(op.row, { onConflict: "id" }));
        } else if (op.kind === "update") {
          ({ error } = await supabase.from(op.table).update(op.patch).eq("id", op.rowId));
        } else {
          ({ error } = await supabase.from(op.table).delete().eq("id", op.rowId));
        }
      } catch (e) {
        error = e;
      }
      if (error && isOfflineError(error)) break;
      commit(load().filter((o) => o.id !== op.id));
      result.cacheKeys.push(op.cacheKey);
      if (error) result.dropped++;
      else {
        result.sent++;
        if (op.kind === "insert" && op.after) notify(op.after);
      }
    }
    return result;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Nettoyage à la déconnexion : une autre personne ne doit pas envoyer nos modifications. */
export function clearOutbox() {
  commit([]);
}
