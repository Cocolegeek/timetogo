// Génère les avatars « Fun Emoji » (DiceBear, licence CC BY 4.0, Davis Uche) dans public/avatars/emoji-N.svg.
// À lancer une seule fois : npm i --no-save @dicebear/core @dicebear/fun-emoji && node scripts/generate-fun-emojis.mjs
// Les fichiers sont versionnés : l'app ne dépend d'aucun service ni d'aucun paquet pour les afficher.
// Le crédit de l'auteur s'affiche sous la grille d'avatars (AvatarPicker).
import { createAvatar } from "@dicebear/core";
import * as funEmoji from "@dicebear/fun-emoji";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Graines retenues à la main : visages joyeux, sans tristesse ni peur. */
const SEEDS = [8, 9, 12, 13, 14, 15, 16, 17, 20, 21, 28, 37, 38, 39, 41, 42, 43, 44, 50, 51, 52, 55, 57, 59];

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "avatars");
mkdirSync(outDir, { recursive: true });
SEEDS.forEach((seed, i) => {
  const svg = createAvatar(funEmoji, { seed: `voyou-${seed}` }).toString();
  writeFileSync(join(outDir, `emoji-${i + 1}.svg`), svg + "\n");
});
console.log(SEEDS.map((_, i) => `  { id: "emoji-${i + 1}", label: "Emoji ${i + 1}" },`).join("\n"));
