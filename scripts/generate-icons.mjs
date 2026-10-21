import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const outputDir = fileURLToPath(new URL("../public/icons/", import.meta.url));
await mkdir(outputDir, { recursive: true });

function logoSvg({ maskable = false } = {}) {
  const artwork = `
    <g stroke="#ffffff" stroke-width="20" stroke-linecap="round" fill="none">
      <path d="M170 158 H268 a44 44 0 0 1 44 44 v22" />
      <path d="M170 354 H268 a44 44 0 0 0 44 -44 v-22" />
      <path d="M170 158 V354" />
    </g>
    <circle cx="170" cy="158" r="42" fill="#ffffff" />
    <circle cx="170" cy="354" r="42" fill="#ffffff" />
    <circle cx="330" cy="256" r="54" fill="#ffffff" />
    <circle cx="170" cy="158" r="15" fill="#0066cc" />
    <circle cx="170" cy="354" r="15" fill="#0066cc" />
    <circle cx="330" cy="256" r="19" fill="#0066cc" />
  `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b7fe8" />
          <stop offset="55%" stop-color="#0066cc" />
          <stop offset="100%" stop-color="#004a9e" />
        </linearGradient>
        <radialGradient id="glow" cx="0.2" cy="0.1" r="0.9">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.24" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" fill="url(#bg)" />
      <rect width="512" height="512" fill="url(#glow)" />
      <circle cx="430" cy="86" r="150" fill="#7cc4ff" opacity="0.09" />
      <circle cx="70" cy="470" r="170" fill="#001f45" opacity="0.14" />
      <g ${maskable ? 'transform="translate(77 77) scale(0.7)"' : ""}>
        ${artwork}
      </g>
    </svg>
  `;
}

const iconTargets = [
  { file: "icon-192.png", size: 192, maskable: false },
  { file: "icon-512.png", size: 512, maskable: false },
  { file: "maskable-512.png", size: 512, maskable: true },
];

for (const target of iconTargets) {
  await sharp(Buffer.from(logoSvg({ maskable: target.maskable })))
    .resize(target.size, target.size)
    .png()
    .toFile(`${outputDir}/${target.file}`);
}

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
await sharp(Buffer.from(logoSvg()))
  .resize(180, 180)
  .png()
  .toFile(`${publicDir}/apple-touch-icon.png`);

console.log("PWA icons generated.");
