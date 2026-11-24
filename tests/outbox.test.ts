import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

const { enqueue, flushOutbox, getOutbox, clearOutbox, isOfflineError } = await import("../lib/offline/outbox.ts");
const { calls, net } = await import("./stub-supabase.ts");

beforeEach(() => {
  clearOutbox();
  calls.length = 0;
  net.offline = false;
});

test("isOfflineError reconnaît une coupure réseau, pas une erreur RLS", () => {
  assert.equal(isOfflineError({ message: "TypeError: Failed to fetch" }), true);
  assert.equal(isOfflineError({ message: 'new row violates row-level security policy' }), false);
});

test("insert en attente + modification + suppression = rien à envoyer", async () => {
  enqueue({ kind: "insert", table: "expenses", rowId: "e1", row: { id: "e1", title: "Resto" }, cacheKey: "expenses:t" });
  enqueue({ kind: "update", table: "expenses", rowId: "e1", patch: { title: "Resto soir" }, cacheKey: "expenses:t" });
  assert.equal(getOutbox().length, 1);
  assert.equal((getOutbox()[0] as unknown as { row: { title: string } }).row.title, "Resto soir");
  enqueue({ kind: "delete", table: "expenses", rowId: "e1", cacheKey: "expenses:t" });
  assert.equal(getOutbox().length, 0);
  const res = await flushOutbox();
  assert.equal(res.sent, 0);
  assert.equal(calls.length, 0);
});

test("hors ligne : la file garde tout ; au retour du réseau : envoi dans l'ordre, une seule fois", async () => {
  enqueue({ kind: "insert", table: "expenses", rowId: "e1", row: { id: "e1" }, cacheKey: "expenses:t" });
  enqueue({ kind: "update", table: "checklist_items", rowId: "c1", patch: { done: true }, cacheKey: "checklist:t" });

  net.offline = true;
  const down = await flushOutbox();
  assert.equal(down.sent, 0);
  assert.equal(getOutbox().length, 2);

  net.offline = false;
  const up = await flushOutbox();
  assert.equal(up.sent, 2);
  assert.deepEqual(calls.map((c) => `${c.op}:${c.table}`), ["upsert:expenses", "update:checklist_items"]);
  assert.deepEqual([...new Set(up.cacheKeys)].sort(), ["checklist:t", "expenses:t"]);
  assert.equal(getOutbox().length, 0);

  const again = await flushOutbox();
  assert.equal(again.sent, 0);
  assert.equal(calls.length, 2);
});

test("la file survit à un rechargement (persistée dans localStorage)", () => {
  enqueue({ kind: "insert", table: "expenses", rowId: "e9", row: { id: "e9" }, cacheKey: "expenses:t" });
  const saved = JSON.parse(store.get("voyou-outbox-v1")!);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].rowId, "e9");
});

test("suppression d'une ligne déjà synchronisée : envoyée comme delete", async () => {
  enqueue({ kind: "delete", table: "expenses", rowId: "old", cacheKey: "expenses:t" });
  await flushOutbox();
  assert.deepEqual(calls, [{ op: "delete", table: "expenses", id: "old" }]);
});
