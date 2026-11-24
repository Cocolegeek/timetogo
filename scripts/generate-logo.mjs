// Generates the Voyou logo ("oyo" face: o o = eyes, y = nose + cheeky smile)
// and every icon size. Run: node scripts/generate-logo.mjs (needs Playwright for PNGs).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

export const LOGO_BG = "#FFC83D";
export const LOGO_INK = "#15171C";

/** Face paths in a 512 box. `scale` < 1 shrinks the face (maskable safe zone). */
export function face(ink = LOGO_INK, scale = 1) {
  const t = scale === 1 ? "" : ` transform="translate(${256 * (1 - scale)} ${256 * (1 - scale)}) scale(${scale})"`;
  return `<g${t} fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round">
<circle cx="174" cy="214" r="54" stroke-width="36"/><circle cx="338" cy="214" r="54" stroke-width="36"/>
<circle cx="190" cy="212" r="17" fill="${ink}" stroke="none"/><circle cx="354" cy="212" r="17" fill="${ink}" stroke="none"/>
<path d="M228 270 L256 314 L284 270 M256 314 C254 366 308 394 364 366" stroke-width="34"/>
</g>`;
}

export function logoSvg({ bg = LOGO_BG, ink = LOGO_INK, radius = 150, scale = 1 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="${bg}"/>${face(ink, scale)}</svg>\n`;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(join(root, "icons"), { recursive: true });
writeFileSync(join(root, "icons", "icon.svg"), logoSvg());
writeFileSync(join(root, "icons", "icon-maskable.svg"), logoSvg({ radius: 0, scale: 0.78 }));

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)("playwright"));
} catch {
  console.log("SVG written. Install Playwright to render the PNG sizes.");
  process.exit(0);
}
const browser = await chromium.launch();
const page = await browser.newPage();
const render = async (svg, size, file) => {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(root, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
};
await render(logoSvg(), 512, "icons/icon.png");
await render(logoSvg(), 192, "icons/icon-192.png");
await render(logoSvg({ radius: 0, scale: 0.78 }), 512, "icons/icon-maskable-512.png");
await render(logoSvg({ radius: 0, scale: 0.78 }), 192, "icons/icon-maskable-192.png");
// 1024 px, plein cadre : exigé par Meta (Facebook Login) et les stores.
await render(logoSvg({ radius: 0, scale: 0.78 }), 1024, "icons/icon-1024.png");
await render(logoSvg({ radius: 0, scale: 0.86 }), 180, "icons/apple-touch-icon.png");
await render(logoSvg(), 32, "icons/favicon-32.png");
// Android status-bar badge: white silhouette on transparent, face slightly enlarged.
await render(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 60 432 432">${face("#FFFFFF")}</svg>`, 96, "icons/badge-96.png");
await browser.close();
console.log("Logo + icons written.");
