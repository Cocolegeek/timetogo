import { test } from "node:test";
import assert from "node:assert/strict";
import { errorRedirectUrl, safeRedirectPath } from "../lib/auth/redirect.ts";
import { linkedProviders, parseProvider, providersLabel } from "../lib/auth/providers.ts";

const ORIGIN = "https://voyou.app";

test("safeRedirectPath: chemins internes seulement", () => {
  assert.equal(safeRedirectPath("/trips/abc?tab=balances"), "/trips/abc?tab=balances");
  assert.equal(safeRedirectPath("//evil.com"), "/trips");
  assert.equal(safeRedirectPath("/\\evil.com"), "/trips");
  assert.equal(safeRedirectPath("https://evil.com"), "/trips");
  assert.equal(safeRedirectPath(null), "/trips");
});

test("erreur OAuth pendant la sauvegarde d'un invité : retour sur /auth/link en gardant le fournisseur", () => {
  const url = new URL(errorRedirectUrl(ORIGIN, "/auth/link?provider=facebook&step=claim", "identity_already_exists"));
  assert.equal(url.pathname, "/auth/link");
  assert.equal(url.searchParams.get("provider"), "facebook");
  assert.equal(url.searchParams.get("error_code"), "identity_already_exists");
  assert.equal(url.searchParams.get("step"), null);
});

test("erreur OAuth ailleurs : retour sur /login, sans paramètre parasite", () => {
  const url = new URL(errorRedirectUrl(ORIGIN, "/trips?x=1&provider=facebook", "access_denied"));
  assert.equal(url.origin + url.pathname, "https://voyou.app/login");
  assert.equal(url.searchParams.get("error_code"), "access_denied");
  assert.equal(url.searchParams.get("provider"), null);
});

test("erreur OAuth : /auth/link sans fournisseur → pas de paramètre provider", () => {
  const url = new URL(errorRedirectUrl(ORIGIN, "/auth/link", "access_denied"));
  assert.equal(url.pathname, "/auth/link");
  assert.equal(url.searchParams.has("provider"), false);
});

test("parseProvider: seule la valeur « facebook » est reconnue, le reste retombe sur Google", () => {
  assert.equal(parseProvider("facebook"), "facebook");
  assert.equal(parseProvider("google"), "google");
  assert.equal(parseProvider("github"), "google");
  assert.equal(parseProvider(null), "google");
});

test("linkedProviders: identités connues, sans doublon, repli sur app_metadata", () => {
  assert.deepEqual(linkedProviders({ identities: [{ provider: "google" }, { provider: "facebook" }, { provider: "google" }] }), ["google", "facebook"]);
  assert.deepEqual(linkedProviders({ identities: [], app_metadata: { provider: "facebook" } }), ["facebook"]);
  assert.deepEqual(linkedProviders({ identities: [{ provider: "email" }] }), []);
  assert.deepEqual(linkedProviders(null), []);
  assert.equal(providersLabel(["google", "facebook"]), "Google et Facebook");
});

test("Facebook est masqué par défaut, affiché seulement avec NEXT_PUBLIC_FACEBOOK_LOGIN=true", async () => {
  const off = await import("../lib/auth/providers.ts");
  assert.deepEqual(off.enabledProviders(), ["google"]);
  assert.equal(off.loginChoicesLabel(), "Google");

  process.env.NEXT_PUBLIC_FACEBOOK_LOGIN = "true";
  const variant = "../lib/auth/providers.ts?facebook-on";
  const on: typeof off = await import(/* @vite-ignore */ variant);
  assert.deepEqual(on.enabledProviders(), ["google", "facebook"]);
  assert.equal(on.loginChoicesLabel(), "Google ou Facebook");
  delete process.env.NEXT_PUBLIC_FACEBOOK_LOGIN;
});
