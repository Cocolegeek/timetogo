import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addPerson, buildPayload, datePresets, effectiveName, firstIssue, initialState, participantsOf, stepsFor,
  suggestName, tripLength, validateStep, type WizardState,
} from "../lib/trips/create-wizard.ts";

const D = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const trip = (over: Partial<WizardState> = {}): WizardState => ({ ...initialState("trip", D("2026-06-03"), "Alice"), destination: "Rome, Latium, Italie", ...over });
const group = (over: Partial<WizardState> = {}): WizardState => ({ ...initialState("group", D("2026-06-03"), "Alice"), name: "Coloc", nameTouched: true, ...over });

test("étapes : un voyage commence par la destination, un budget par son nom", () => {
  assert.deepEqual(stepsFor("trip"), ["where", "when", "who"]);
  assert.deepEqual(stepsFor("group"), ["what", "when", "who"]);
});

test("le nom du voyage se propose tout seul d'après la destination, sauf si on l'a écrit", () => {
  assert.equal(suggestName("Rome, Latium, Italie"), "Voyage à Rome");
  assert.equal(suggestName(""), "");
  assert.equal(effectiveName(trip()), "Voyage à Rome");
  assert.equal(effectiveName(trip({ name: "Escapade", nameTouched: true })), "Escapade");
  assert.equal(effectiveName(trip({ name: "", nameTouched: true })), "Voyage à Rome");
  assert.equal(effectiveName(group({ name: "", nameTouched: false })), "");
});

test("la création ne bloque plus en silence : chaque obstacle a un message et une étape", () => {
  assert.equal(validateStep("where", trip({ destination: "" }))?.message, "Choisis une destination pour continuer.");
  assert.equal(validateStep("what", group({ name: "  " }))?.message, "Donne un nom à ton budget.");
  assert.equal(validateStep("when", trip({ startDate: "" }))?.message, "Choisis la date de départ.");
  assert.equal(validateStep("when", trip({ startDate: "2026-06-10", endDate: "2026-06-08" }))?.message, "Le retour doit être après le départ.");
  assert.equal(validateStep("who", trip({ creator: null, extra: [] }))?.message, "Commence par ton prénom, tu fais partie du voyage.");
  assert.equal(validateStep("who", trip({ budget: "abc" }))?.step, "who");
  assert.equal(firstIssue(trip({ destination: "", extra: [] }))?.step, "where");
  assert.equal(firstIssue(trip()), null);
});

test("le créateur compte (c'était la cause du blocage) : seul avec son prénom, on peut créer", () => {
  const s = trip({ extra: [] });
  assert.deepEqual(participantsOf(s).map((p) => p.name), ["Alice"]);
  assert.equal(validateStep("who", s), null);
  assert.equal(validateStep("who", trip({ creator: null, extra: [], friendCount: 1 })), null);
});

test("ajouter des prénoms : doublons refusés sans tenir compte des accents ni de la casse", () => {
  const s = trip();
  const r1 = addPerson(s, "  Léa ");
  assert.equal(r1.error, null);
  assert.deepEqual(r1.extra.map((p) => p.name), ["Léa"]);
  const s2 = { ...s, extra: r1.extra };
  assert.match(addPerson(s2, "lea").error ?? "", /déjà/);
  assert.match(addPerson(s2, "ALICE").error ?? "", /déjà/);
  assert.deepEqual(addPerson(s2, "   ").extra, s2.extra);
  assert.equal(new Set(participantsOf(s2).map((p) => p.color)).size, 2);
});

test("un budget de groupe sans date : permanent, ni départ ni retour envoyés", () => {
  const p = buildPayload(group());
  assert.equal(p.startDate, undefined);
  assert.equal(p.endDate, undefined);
  assert.equal(p.type, "group");
  assert.equal(p.destination, undefined);
  assert.equal(validateStep("when", group()), null);
});

test("budget de groupe : un jour précis envoie la même date au départ et au retour ; une période les deux", () => {
  const one = buildPayload(group({ dateMode: "date_fixe", startDate: "2026-07-14" }));
  assert.deepEqual([one.startDate, one.endDate], ["2026-07-14", "2026-07-14"]);
  assert.equal(validateStep("when", group({ dateMode: "date_fixe", startDate: "" }))?.message, "Choisis la date de départ.");
  const range = buildPayload(group({ dateMode: "creneau", startDate: "2026-07-14", endDate: "2026-07-20" }));
  assert.deepEqual([range.startDate, range.endDate], ["2026-07-14", "2026-07-20"]);
  assert.equal(validateStep("when", group({ dateMode: "creneau", startDate: "2026-07-14", endDate: "" }))?.message, "Choisis la date de retour.");
});

test("charge utile d'un voyage : nom proposé, destination nettoyée, budget lu avec une virgule", () => {
  const p = buildPayload(trip({ destination: " Rome, Italie ", budget: "1 500,5".replace(" ", ""), currency: "USD" }));
  assert.equal(p.name, "Voyage à Rome");
  assert.equal(p.destination, "Rome, Italie");
  assert.equal(p.totalBudget, 1500.5);
  assert.equal(p.currency, "USD");
  assert.equal(p.participants[0].name, "Alice");
  assert.equal(buildPayload(trip({ budget: "" })).totalBudget, undefined);
});

test("dates rapides : un mercredi, ce week-end = vendredi à dimanche, semaine prochaine = lundi à dimanche", () => {
  const [we, nw, tw] = datePresets(D("2026-06-03")); // mercredi
  assert.deepEqual([we.start, we.end], ["2026-06-05", "2026-06-07"]);
  assert.deepEqual([nw.start, nw.end], ["2026-06-08", "2026-06-14"]);
  assert.deepEqual([tw.start, tw.end], ["2026-06-06", "2026-06-19"]);
});

test("dates rapides : le vendredi, le week-end commence aujourd'hui ; le samedi et le dimanche, on vise le suivant", () => {
  assert.deepEqual(datePresets(D("2026-06-05"))[0].start, "2026-06-05");
  assert.deepEqual(datePresets(D("2026-06-06"))[0].start, "2026-06-12");
  assert.deepEqual(datePresets(D("2026-06-07"))[0].start, "2026-06-12");
  assert.deepEqual(datePresets(D("2026-06-08"))[1].start, "2026-06-15");
});

test("durée : jours et nuits, nulle si les dates sont à l'envers", () => {
  assert.deepEqual(tripLength("2026-06-05", "2026-06-07"), { days: 3, nights: 2 });
  assert.deepEqual(tripLength("2026-06-05", "2026-06-05"), { days: 1, nights: 0 });
  assert.equal(tripLength("2026-06-07", "2026-06-05"), null);
  assert.equal(tripLength("", "2026-06-05"), null);
});
