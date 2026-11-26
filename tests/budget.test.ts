import { test } from "node:test";
import assert from "node:assert/strict";
import { computeShares, dropZeroShares } from "../lib/budget/splits.ts";
import { computeBalances, simplifyDebts } from "../lib/budget/debts.ts";
import type { Expense, Participant, ParticipantSplit } from "../types/index.ts";

const split = (id: string, extra: Partial<ParticipantSplit> = {}): ParticipantSplit => ({
  participantId: id,
  excluded: false,
  percentage: 0,
  fixedAmount: 0,
  share: 0,
  ...extra,
});
const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

test("equal: 100 / 3 distribue le reste au centime, total exact", () => {
  const out = computeShares(100, [split("a"), split("b"), split("c")], "equal");
  assert.deepEqual(out.map((s) => s.share), [33.34, 33.33, 33.33]);
  assert.equal(sum(out.map((s) => s.share!)), 100);
});

test("equal: un participant exclu ne paie rien", () => {
  const out = computeShares(10, [split("a"), split("b", { excluded: true })], "equal");
  assert.deepEqual(out.map((s) => s.share), [10, 0]);
});

test("percentage: le dernier absorbe l'écart d'arrondi", () => {
  const out = computeShares(
    100,
    [split("a", { percentage: 33.33 }), split("b", { percentage: 33.33 }), split("c", { percentage: 33.34 })],
    "percentage"
  );
  assert.equal(sum(out.map((s) => s.share!)), 100);
});

test("fixed: montants repris tels quels", () => {
  const out = computeShares(30, [split("a", { fixedAmount: 10 }), split("b", { fixedAmount: 20 })], "fixed");
  assert.deepEqual(out.map((s) => s.share), [10, 20]);
});

test("equal: aucun participant actif ne plante", () => {
  const out = computeShares(10, [split("a", { excluded: true })], "equal");
  assert.equal(out[0].share, 0);
});

const people: Participant[] = ["a", "b", "c"].map((id) => ({ id, name: id, color: "#000" }) as Participant);
const expense = (payer: string, amount: number, ids: string[]): Expense =>
  ({
    payers: [{ participantId: payer, amount }],
    splits: computeShares(amount, ids.map((id) => split(id)), "equal"),
  }) as unknown as Expense;

test("balances: la somme des soldes est nulle", () => {
  const b = computeBalances([expense("a", 100, ["a", "b", "c"]), expense("b", 40, ["b", "c"])], people);
  assert.equal(sum(b.map((x) => x.net)), 0);
});

test("simplifyDebts: A doit à B, B doit à C → A paie C", () => {
  const out = simplifyDebts([
    { participantId: "a", paid: 0, owes: 10, net: -10 },
    { participantId: "b", paid: 10, owes: 10, net: 0 },
    { participantId: "c", paid: 10, owes: 0, net: 10 },
  ]);
  assert.deepEqual(out, [{ fromId: "a", toId: "c", amount: 10 }]);
});

test("simplifyDebts: appliquer les virements solde tout le monde (20 participants)", () => {
  const ids = Array.from({ length: 20 }, (_, i) => `p${i}`);
  const ps = ids.map((id) => ({ id, name: id, color: "#000" }) as Participant);
  const exps = ids.map((id, i) => expense(id, 37.31 + i * 3.17, ids.filter((_, j) => (i + j) % 3 !== 0)));
  const balances = computeBalances(exps, ps);
  const transfers = simplifyDebts(balances);
  assert.ok(transfers.length <= ids.length - 1);
  const net = new Map(balances.map((b) => [b.participantId, b.net]));
  for (const t of transfers) {
    net.set(t.fromId, net.get(t.fromId)! + t.amount);
    net.set(t.toId, net.get(t.toId)! - t.amount);
  }
  for (const v of net.values()) assert.ok(Math.abs(v) < 0.02, `solde résiduel ${v}`);
});

test("simplifyDebts: déjà quittes → aucun virement", () => {
  assert.deepEqual(simplifyDebts([{ participantId: "a", paid: 5, owes: 5, net: 0 }]), []);
});

test("Régler: l'écriture de remboursement ramène les soldes à zéro", () => {
  const base = [expense("a", 90, ["a", "b", "c"])];
  const before = computeBalances(base, people);
  const [t] = simplifyDebts(before);
  const reimbursement = {
    payers: [{ participantId: t.fromId, amount: t.amount }],
    splits: computeShares(
      t.amount,
      people.map((p) => split(p.id, { excluded: p.id !== t.toId, fixedAmount: p.id === t.toId ? t.amount : 0 })),
      "fixed"
    ),
  } as unknown as Expense;
  const after = computeBalances([...base, reimbursement], people);
  const left = simplifyDebts(after);
  assert.equal(left.length, 1);
  assert.equal(sum(after.map((b) => b.net)), 0);
  assert.equal(after.find((b) => b.participantId === t.fromId)!.net, 0);
  assert.notEqual(left[0].fromId, t.fromId);
});

import { convertPayers, toTripAmount, parseRate } from "../lib/budget/currency.ts";

test("devises: conversion arrondie au centime", () => {
  assert.equal(toTripAmount(100, 0.9234), 92.34);
  assert.equal(toTripAmount(33.33, 0.9234), 30.78);
});

test("devises: la somme des payeurs convertis égale le total (pas de centime perdu)", () => {
  const rate = 0.9234;
  const payers = [
    { participantId: "a", amount: 33.33 },
    { participantId: "b", amount: 33.33 },
    { participantId: "c", amount: 33.34 },
  ];
  const total = toTripAmount(100, rate);
  const out = convertPayers(payers, rate, total);
  assert.equal(sum(out.map((p) => p.amount)), total);
});

test("devises: taux saisi avec virgule, invalide → 0", () => {
  assert.equal(parseRate("0,92"), 0.92);
  assert.equal(parseRate("abc"), 0);
  assert.equal(parseRate("-1"), 0);
});

import { nextRecurrence } from "../lib/budget/recurrence.ts";
import { buildExpensesCsv } from "../lib/export/expenses-csv.ts";
import { buildRecap } from "../lib/export/recap.ts";

test("récurrence: mensuel garde son jour d'ancrage (31 → 28 → 31), hebdo +7", () => {
  assert.equal(nextRecurrence("2026-01-31", "monthly", 31), "2026-02-28");
  assert.equal(nextRecurrence("2026-02-28", "monthly", 31), "2026-03-31");
  assert.equal(nextRecurrence("2026-12-15", "monthly", 15), "2027-01-15");
  assert.equal(nextRecurrence("2026-12-28", "weekly", 28), "2027-01-04");
});

const ppl = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
] as Participant[];
const exp = {
  title: 'Resto "Chez Léa"; midi',
  amount: 12.5,
  currency: "USD",
  exchangeRate: 0.9,
  amountInTripCurrency: 11.25,
  category: "restaurant",
  date: "2026-06-08",
  payers: [{ participantId: "a", amount: 11.25 }],
  splits: [
    { participantId: "a", excluded: false, share: 5.63 },
    { participantId: "b", excluded: false, share: 5.62 },
  ],
} as unknown as Expense;

test("CSV: BOM, séparateur ;, virgule décimale, guillemets échappés", () => {
  const csv = buildExpensesCsv([exp], ppl, "EUR", () => "Restaurant");
  assert.ok(csv.startsWith("﻿Date;Titre;"));
  const row = csv.split("\r\n")[1];
  assert.ok(row.includes('"Resto ""Chez Léa""; midi"'));
  assert.ok(row.includes(";12,5;USD;0,9;11,25;"));
  assert.ok(row.includes("Alice (11,25)"));
  assert.ok(row.endsWith("Alice (5,63) + Bob (5,62)"));
});

test("récap: total, avancé, virements ; tout le monde quitte", () => {
  const fmt = (n: number, c: string) => `${n.toFixed(2)} ${c}`;
  const text = buildRecap({
    tripName: "Rome", currency: "EUR", expenses: [exp], participants: ppl, format: fmt,
    balances: [{ participantId: "a", paid: 11.25, owes: 5.63, net: 5.62 }, { participantId: "b", paid: 0, owes: 5.62, net: -5.62 }],
    settlements: [{ fromId: "b", toId: "a", amount: 5.62 }],
  });
  assert.ok(text.includes("Total dépensé : 11.25 EUR (1 dépense)"));
  assert.ok(text.includes("→ Bob paie 5.62 EUR à Alice"));
  const quits = buildRecap({ tripName: "Rome", currency: "EUR", expenses: [], participants: ppl, balances: [], settlements: [], format: fmt });
  assert.ok(quits.includes("quitte"));
});

test("dropZeroShares: une part à 0 sort de la dépense (montants et pourcentages)", () => {
  const fixed = dropZeroShares([split("a", { fixedAmount: 30 }), split("b", { fixedAmount: 0 })], "fixed");
  assert.equal(fixed[0].excluded, false);
  assert.equal(fixed[1].excluded, true);
  const pct = dropZeroShares([split("a", { percentage: 100 }), split("b", { percentage: 0 })], "percentage");
  assert.equal(pct[1].excluded, true);
  const equal = dropZeroShares([split("a"), split("b", { excluded: true })], "equal");
  assert.equal(equal[0].excluded, false);
  assert.equal(equal[1].excluded, true);
});
