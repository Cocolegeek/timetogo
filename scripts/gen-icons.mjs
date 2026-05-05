import { writeFileSync } from "fs";

const svg512 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#g)"/>
  <text x="256" y="340" font-size="256" text-anchor="middle" font-family="system-ui">✈️</text>
</svg>`;

writeFileSync("public/icons/icon-192.png", svg512);
writeFileSync("public/icons/icon-512.png", svg512);
console.log("Placeholder icons created (SVG content as .png — replace with real PNGs for production)");
