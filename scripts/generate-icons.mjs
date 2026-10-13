/**
 * Regenerates the PWA icon set in public/ from the FabricVerse logo mark.
 *
 *   node scripts/generate-icons.mjs
 *
 * Requires the `sharp` package (bundled with Next.js). The mark paths mirror
 * <LogoMark> in src/components/ui.tsx — update both together.
 */
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = (f) => path.join(root, "public", f);

const MARK_PATHS = `
  <path d="M8 34 C16 44, 24 24, 34 32 C42 38, 50 30, 56 34" />
  <path d="M8 22 C16 32, 24 12, 34 20 C42 26, 50 18, 56 22" />
  <path d="M12 10 C19 18, 26 2, 35 9 C42 14, 49 8, 55 11" />`;

const DEFS = `
  <defs>
    <linearGradient id="g" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="#8b2fe8" />
      <stop offset="55%" stop-color="#d81fa0" />
      <stop offset="100%" stop-color="#ff1e63" />
    </linearGradient>
    <radialGradient id="bg" cx="50%" cy="16%" r="80%">
      <stop offset="0%" stop-color="#341a5e" />
      <stop offset="100%" stop-color="#070a13" />
    </radialGradient>
  </defs>`;

/** Full app icon: brand mark on the dark app background. */
function appIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    ${DEFS}
    <rect width="512" height="512" fill="url(#bg)" />
    <g transform="translate(64,112) scale(6)">
      <g fill="none" stroke="url(#g)" stroke-width="8" stroke-linecap="round">${MARK_PATHS}</g>
    </g>
  </svg>`;
}

/** Small monochrome badge shown beside notification text on Android. */
function badgeIcon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <g transform="translate(12,21) scale(1.125)">
      <g fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round">${MARK_PATHS}</g>
    </g>
  </svg>`;
}

const app = appIcon();
const badge = badgeIcon();

await Promise.all([
  sharp(Buffer.from(app)).resize(192, 192).png().toFile(out("icon-192x192.png")),
  sharp(Buffer.from(app)).resize(512, 512).png().toFile(out("icon-512x512.png")),
  sharp(Buffer.from(app)).resize(180, 180).png().toFile(out("apple-touch-icon.png")),
  sharp(Buffer.from(badge)).png().toFile(out("badge.png")),
]);

console.log("icons written: icon-192x192, icon-512x512, apple-touch-icon, badge");
