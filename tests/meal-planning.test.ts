import { test } from "node:test";
import assert from "node:assert/strict";
import { mealPlanningEntry, SLOT_DEFAULTS } from "../lib/meals/planning.ts";
import { linkHost, normalizeLink } from "../lib/meals/link.ts";

const base = { slot: "lunch" as const, category: "home" as const, title: null, notes: null, dishes: [], participantIds: [], link: null };
const dish = (name: string) => ({ id: name, course: "main" as const, name, ingredients: [] });

test("déjeuner par défaut : 12:00 pendant une heure", () => {
  const e = mealPlanningEntry(base);
  assert.equal(e.time, "12:00");
  assert.equal(e.durationMinutes, 60);
  assert.equal(e.title, "Déjeuner");
  assert.equal(e.description, undefined);
});

test("heures proposées pour chaque repas", () => {
  assert.equal(SLOT_DEFAULTS.breakfast.time, "08:00");
  assert.equal(SLOT_DEFAULTS.snack.durationMinutes, 30);
  assert.equal(SLOT_DEFAULTS.dinner.time, "20:00");
});

test("à la maison : le titre reprend les plats, deux au plus", () => {
  assert.equal(mealPlanningEntry({ ...base, dishes: [dish("Pâtes carbonara")] }).title, "Déjeuner · Pâtes carbonara");
  assert.equal(mealPlanningEntry({ ...base, dishes: [dish("Salade"), dish("Pâtes"), dish("Tiramisu")] }).title, "Déjeuner · Salade, Pâtes +1");
  assert.equal(mealPlanningEntry({ ...base, title: "Chez Léa" }).title, "Déjeuner · Chez Léa");
});

test("resto : le nom du resto, sinon « Resto » ; le lien et les notes vont dans la description", () => {
  const e = mealPlanningEntry({ ...base, slot: "dinner", category: "restaurant", title: "Le bistrot", link: "https://bistrot.fr/", notes: "Table à 20 h 30" });
  assert.equal(e.title, "Dîner · Le bistrot");
  assert.equal(e.description, "https://bistrot.fr/\nTable à 20 h 30");
  assert.equal(mealPlanningEntry({ ...base, category: "restaurant" }).title, "Déjeuner · Resto");
});

test("pique-nique : titre fixe ; à la maison, le lien est ignoré", () => {
  assert.equal(mealPlanningEntry({ ...base, category: "picnic" }).title, "Déjeuner · Pique-nique");
  assert.equal(mealPlanningEntry({ ...base, link: "https://exemple.fr/" }).description, undefined);
});

test("les participants du repas passent tels quels", () => {
  assert.deepEqual(mealPlanningEntry({ ...base, participantIds: ["a", "b"] }).participantIds, ["a", "b"]);
});

test("normalizeLink : ajoute https, refuse le reste", () => {
  assert.equal(normalizeLink("chezlea.fr/menu"), "https://chezlea.fr/menu");
  assert.equal(normalizeLink("  https://www.exemple.com  "), "https://www.exemple.com/");
  assert.equal(normalizeLink(""), null);
  assert.equal(normalizeLink("pas un lien"), null);
  assert.equal(normalizeLink("javascript:alert(1)"), null);
  assert.equal(normalizeLink("localhost"), null);
});

test("linkHost : le nom du site sans www", () => {
  assert.equal(linkHost("https://www.chezlea.fr/menu?x=1"), "chezlea.fr");
  assert.equal(linkHost("n'importe quoi"), "n'importe quoi");
});
