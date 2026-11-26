import { test } from "node:test";
import assert from "node:assert/strict";
import {
  avatarDataUrl,
  avatarSvg,
  isBuiltAvatar,
  normalizeConfig,
  parseAvatarConfig,
  randomConfig,
  HAIR_STYLES,
  HATS,
  MASKS,
} from "../lib/avatar-builder.ts";

test("avatar: la configuration survit à l'enregistrement et se relit", () => {
  const cfg = normalizeConfig({ skin: 4, hair: "tresses", hairColor: 5, hat: "crown", glasses: "round", bg: 6 });
  const url = avatarDataUrl(cfg);
  assert.ok(isBuiltAvatar(url));
  assert.deepEqual(parseAvatarConfig(url), cfg);
});

test("avatar: photo, chemin et vide ne sont pas des avatars créés", () => {
  assert.equal(parseAvatarConfig("https://exemple.fr/p.jpg"), null);
  assert.equal(parseAvatarConfig("/avatars/dj.svg"), null);
  assert.equal(parseAvatarConfig(null), null);
});

test("avatar: valeurs invalides ramenées à des choix valides", () => {
  const cfg = normalizeConfig({ skin: 99, hair: "inconnu" as never, hat: "x" as never, bg: -3 });
  assert.ok(cfg.skin >= 0 && cfg.skin < 6);
  assert.ok(cfg.bg >= 0 && cfg.bg < 8);
  assert.equal(cfg.hair, "court");
  assert.equal(cfg.hat, "none");
});

test("avatar: au hasard avec graine est reproductible", () => {
  assert.deepEqual(randomConfig("abc"), randomConfig("abc"));
  assert.notDeepEqual(randomConfig("abc"), randomConfig("xyz"));
});

test("avatar: toutes les coupes, chapeaux et masques produisent un SVG sans script", () => {
  for (const hair of HAIR_STYLES) for (const hat of HATS) {
    const svg = avatarSvg({ hair, hat });
    assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"));
    assert.ok(!/<script|onload|javascript:/i.test(svg));
  }
  for (const mask of MASKS) assert.ok(avatarSvg({ mask }).includes("</svg>"));
});
