import { test } from "node:test";
import assert from "node:assert/strict";
import { tripDays } from "../lib/trip-days.ts";
import { featuresWithContent } from "../lib/trip-features.ts";

test("avec une période : tous ses jours", () => {
  assert.deepEqual(tripDays({ startDate: "2026-06-05", endDate: "2026-06-07" }, [], "2026-06-01"), ["2026-06-05", "2026-06-06", "2026-06-07"]);
});

test("un jour rempli hors période reste visible", () => {
  assert.deepEqual(tripDays({ startDate: "2026-06-05", endDate: "2026-06-06" }, ["2026-06-20"], "2026-06-01"), ["2026-06-05", "2026-06-06", "2026-06-20"]);
});

test("sans période : les jours remplis, sinon aujourd'hui", () => {
  assert.deepEqual(tripDays({}, [], "2026-06-01"), ["2026-06-01"]);
  assert.deepEqual(tripDays({}, ["2026-07-03", "2026-07-01", "2026-07-03"], "2026-06-01"), ["2026-07-01", "2026-07-03"]);
});

test("un espace non coché compte dès qu'il contient quelque chose", () => {
  const f = featuresWithContent({ modules: [] }, { planning: 2, menus: 0, lists: 0 });
  assert.equal(f.hasPlanning, true);
  assert.equal(f.hasMenus, false);
  assert.equal(featuresWithContent({ modules: ["lists"] }, { planning: 0, menus: 0, lists: 0 }).hasLists, true);
});
