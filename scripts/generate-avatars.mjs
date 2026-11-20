// Generates the preset avatar library in public/avatars/*.svg.
// Run: node scripts/generate-avatars.mjs  (then keep lib/avatars.ts in sync)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const C = {
  ink: "#1A1D24",
  white: "#FFFFFF",
  sky: "#CFDDE8",
  sand: "#E9E1D3",
  sage: "#C5D3BF",
  clay: "#D99C82",
  night: "#22283A",
  gold: "#F0BE4C",
  lilac: "#D9D3EC",
  peach: "#F4C7A8",
  rose: "#E58B9E",
  teal: "#3D8B7D",
  blue: "#5B7DB1",
};

const head = (fill) => `<circle cx="64" cy="62" r="30" fill="${fill}"/>`;
const body = (fill) => `<path d="M22 128c0-24 18-36 42-36s42 12 42 36z" fill="${fill}"/>`;
const cheeks = `<circle cx="47" cy="70" r="4.5" fill="${C.rose}" opacity=".45"/><circle cx="81" cy="70" r="4.5" fill="${C.rose}" opacity=".45"/>`;

const eyes = {
  dots: `<circle cx="54" cy="60" r="3.6" fill="${C.ink}"/><circle cx="74" cy="60" r="3.6" fill="${C.ink}"/>`,
  happy: `<path d="M50 61q4-5 8 0M70 61q4-5 8 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  wink: `<circle cx="54" cy="60" r="3.6" fill="${C.ink}"/><path d="M70 61q4-5 8 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  sleepy: `<path d="M50 61h8M70 61h8" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
  stars: `<path d="M54 54l1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.1-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z" fill="${C.gold}"/><path d="M74 54l1.8 3.9 4.2.5-3.1 2.9.8 4.2-3.7-2.1-3.7 2.1.8-4.2-3.1-2.9 4.2-.5z" fill="${C.gold}"/>`,
};

const mouths = {
  smile: `<path d="M56 71q8 7 16 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  grin: `<path d="M54 69h20q0 11-10 11t-10-11z" fill="${C.ink}"/><path d="M58 76q6 4 12 0v4h-12z" fill="${C.rose}"/>`,
  tongue: `<path d="M56 70q8 7 16 0" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M63 74h7v4a3.5 3.5 0 0 1-7 0z" fill="${C.rose}"/>`,
  oh: `<ellipse cx="64" cy="74" rx="4" ry="5" fill="${C.ink}"/>`,
  flat: `<path d="M57 73h14" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`,
};

const acc = {
  sunglasses: `<rect x="44" y="53" width="18" height="13" rx="5" fill="${C.ink}"/><rect x="66" y="53" width="18" height="13" rx="5" fill="${C.ink}"/><path d="M62 58h4" stroke="${C.ink}" stroke-width="3"/><path d="M47 56l5 0" stroke="${C.white}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`,
  roundGlasses: `<circle cx="54" cy="60" r="8" fill="none" stroke="${C.ink}" stroke-width="2.6"/><circle cx="74" cy="60" r="8" fill="none" stroke="${C.ink}" stroke-width="2.6"/><path d="M62 60h4" stroke="${C.ink}" stroke-width="2.6"/>`,
  beret: `<ellipse cx="60" cy="36" rx="30" ry="11" fill="${C.ink}" transform="rotate(-10 60 36)"/><path d="M62 24v-6" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>`,
  bucketHat: `<path d="M40 44q2-20 24-20t24 20z" fill="${C.white}"/><path d="M30 46q34-8 68 0l-4 6q-30-6-60 0z" fill="${C.white}"/><path d="M41 42h46" stroke="${C.clay}" stroke-width="4"/>`,
  cap: `<path d="M36 50q0-24 28-24t28 24z" fill="${C.clay}"/><path d="M84 46q14 0 18 6l-18 2z" fill="${C.clay}"/><circle cx="64" cy="27" r="3" fill="${C.ink}"/>`,
  beanie: `<path d="M35 52q0-28 29-28t29 28z" fill="${C.night}"/><rect x="33" y="44" width="62" height="10" rx="5" fill="${C.teal}"/><circle cx="64" cy="20" r="7" fill="${C.white}"/>`,
  headphones: `<path d="M34 62q0-34 30-34t30 34" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="28" y="56" width="11" height="20" rx="5" fill="${C.clay}"/><rect x="89" y="56" width="11" height="20" rx="5" fill="${C.clay}"/>`,
  flower: `<g transform="translate(86 36)"><circle cx="0" cy="-7" r="6" fill="${C.white}"/><circle cx="7" cy="0" r="6" fill="${C.white}"/><circle cx="0" cy="7" r="6" fill="${C.white}"/><circle cx="-7" cy="0" r="6" fill="${C.white}"/><circle r="5" fill="${C.gold}"/></g>`,
  chef: `<path d="M42 40h44v-8a10 10 0 0 0-6-18 12 12 0 0 0-16-4 12 12 0 0 0-16 4 10 10 0 0 0-6 18z" fill="${C.white}"/><rect x="42" y="34" width="44" height="10" rx="3" fill="${C.white}" stroke="${C.sand}" stroke-width="2"/>`,
  safari: `<path d="M40 44q2-18 24-18t24 18z" fill="${C.sand}"/><path d="M28 46q36-10 72 0q-36 6-72 0z" fill="${C.sand}"/><path d="M41 41h46" stroke="${C.clay}" stroke-width="5"/>`,
  nightcap: `<path d="M34 50q2-26 30-26q24 0 30 26z" fill="${C.blue}"/><path d="M90 34q14 10 10 28" stroke="${C.blue}" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="100" cy="64" r="6" fill="${C.white}"/><rect x="33" y="44" width="62" height="9" rx="4.5" fill="${C.white}"/>`,
  mustache: `<path d="M64 69q-6-5-14 0q-4 3-8 0q4 9 14 6q6-2 8-6q2 4 8 6q10 3 14-6q-4 3-8 0q-8-5-14 0z" fill="${C.ink}"/>`,
  bandana: `<path d="M38 96q26 16 52 0l-26 22z" fill="${C.rose}"/><circle cx="58" cy="102" r="2" fill="${C.white}"/><circle cx="70" cy="104" r="2" fill="${C.white}"/>`,
  mask: `<rect x="40" y="49" width="48" height="22" rx="11" fill="${C.white}" fill-opacity=".45" stroke="${C.ink}" stroke-width="3"/><path d="M90 76v-34q0-6 6-6" stroke="${C.gold}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  freckles: `<g fill="${C.clay}"><circle cx="47" cy="67" r="1.4"/><circle cx="51" cy="70" r="1.4"/><circle cx="45" cy="71" r="1.4"/><circle cx="81" cy="67" r="1.4"/><circle cx="77" cy="70" r="1.4"/><circle cx="83" cy="71" r="1.4"/></g>`,
  tuft: `<path d="M58 33q2-10 8-12M64 32q4-9 11-9M70 34q6-6 12-4" stroke="${C.ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  bow: `<path d="M64 31l-12-7v14zM64 31l12-7v14z" fill="${C.rose}"/><circle cx="64" cy="31" r="3.5" fill="${C.rose}"/>`,
};

/** id → [label, background, head, shirt, eyes, mouth, accessories in draw order, cheeks?] */
const AVATARS = [
  ["soleil", "Soleil", C.sky, C.gold, C.white, "dots", "smile", ["sunglasses"], false],
  ["parisien", "Parisien", C.sand, C.clay, C.ink, "happy", "smile", ["beret", "mustache"], false],
  ["festival", "Festival", C.lilac, C.sage, C.clay, "happy", "grin", ["bucketHat"], true],
  ["plongee", "Plongée", C.sand, C.sky, C.blue, "dots", "oh", ["mask"], false],
  ["dj", "DJ", C.sage, C.lilac, C.ink, "sleepy", "smile", ["headphones"], true],
  ["skate", "Skate", C.gold, C.white, C.clay, "wink", "tongue", ["cap"], true],
  ["montagne", "Montagne", C.sky, C.clay, C.night, "happy", "grin", ["beanie"], true],
  ["coquin", "Coquin", C.lilac, C.gold, C.teal, "wink", "smile", ["tuft"], true],
  ["lecture", "Lecture", C.sand, C.sage, C.blue, "dots", "flat", ["roundGlasses", "tuft"], false],
  ["fleur", "Fleur", C.gold, C.lilac, C.white, "happy", "smile", ["flower"], true],
  ["chef", "Chef", C.sage, C.peach, C.white, "happy", "grin", ["chef"], true],
  ["explo", "Explo", C.night, C.sand, C.sage, "dots", "smile", ["safari"], false],
  ["dodo", "Dodo", C.lilac, C.sky, C.blue, "sleepy", "oh", ["nightcap"], false],
  ["star", "Star", C.night, C.peach, C.rose, "stars", "grin", ["freckles"], false],
  ["pirate", "Pirate", C.clay, C.sand, C.ink, "dots", "tongue", ["mustache", "bandana"], false],
  ["choupi", "Choupi", C.sky, C.peach, C.sage, "happy", "smile", ["bow", "freckles"], true],
];

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "avatars");
mkdirSync(outDir, { recursive: true });

for (const [id, , bg, headFill, shirt, eye, mouth, accs, blush] of AVATARS) {
  const over = accs.filter((a) => !["bandana"].includes(a)).map((a) => acc[a]).join("");
  const under = accs.includes("bandana") ? acc.bandana : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="${bg}"/>${body(shirt)}${under}${head(headFill)}${blush ? cheeks : ""}${eyes[eye]}${mouths[mouth]}${over}</svg>\n`;
  writeFileSync(join(outDir, `${id}.svg`), svg);
}

console.log(AVATARS.map(([id, label]) => `  { id: "${id}", label: "${label}" },`).join("\n"));
