import { PNG } from 'pngjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public');
mkdirSync(outDir, { recursive: true });

const BG_TOP = { r: 0x1f, g: 0x29, b: 0x37 };
const BG_BOTTOM = { r: 0x0b, g: 0x10, b: 0x18 };
const ACCENT = { r: 0xc8, g: 0xa0, b: 0x6b };
const INK = { r: 0xf5, g: 0xef, b: 0xe6 };

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}
function mixColor(c1, c2, t) {
  return { r: lerp(c1.r, c2.r, t), g: lerp(c1.g, c2.g, t), b: lerp(c1.b, c2.b, t) };
}
function setPixel(png, x, y, color, alpha = 255) {
  const idx = (png.width * y + x) << 2;
  png.data[idx] = color.r;
  png.data[idx + 1] = color.g;
  png.data[idx + 2] = color.b;
  png.data[idx + 3] = alpha;
}

// 5x7 bitmap font for the letters E and A
const FONT = {
  E: [
    '11111',
    '10000',
    '10000',
    '11110',
    '10000',
    '10000',
    '11111',
  ],
  A: [
    '01110',
    '10001',
    '10001',
    '11111',
    '10001',
    '10001',
    '10001',
  ],
};

function drawLetter(png, letter, originX, originY, scale, color) {
  const glyph = FONT[letter];
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (glyph[row][col] !== '1') continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const x = originX + col * scale + dx;
          const y = originY + row * scale + dy;
          if (x >= 0 && x < png.width && y >= 0 && y < png.height) {
            setPixel(png, x, y, color);
          }
        }
      }
    }
  }
}

function generate(size, opts = {}) {
  const png = new PNG({ width: size, height: size });
  const radius = opts.maskable ? size : Math.round(size * 0.22);
  const safePad = opts.maskable ? Math.round(size * 0.1) : 0;
  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const bg = mixColor(BG_TOP, BG_BOTTOM, t);
    for (let x = 0; x < size; x++) {
      // rounded-square mask for non-maskable
      const inCorner =
        (x < radius && y < radius && Math.hypot(radius - x, radius - y) > radius) ||
        (x >= size - radius && y < radius && Math.hypot(x - (size - radius - 1), radius - y) > radius) ||
        (x < radius && y >= size - radius && Math.hypot(radius - x, y - (size - radius - 1)) > radius) ||
        (x >= size - radius && y >= size - radius && Math.hypot(x - (size - radius - 1), y - (size - radius - 1)) > radius);
      if (!opts.maskable && inCorner) {
        setPixel(png, x, y, { r: 0, g: 0, b: 0 }, 0);
      } else {
        setPixel(png, x, y, bg);
      }
    }
  }

  // Subtle accent diagonal stripe
  const stripeStart = Math.round(size * 0.62);
  for (let y = stripeStart; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.abs(x + y - (stripeStart + size * 0.45));
      if (dist < size * 0.012) {
        const idx = (png.width * y + x) << 2;
        if (png.data[idx + 3] === 0) continue;
        png.data[idx] = ACCENT.r;
        png.data[idx + 1] = ACCENT.g;
        png.data[idx + 2] = ACCENT.b;
      }
    }
  }

  // Draw "EA" centered in the safe area
  const inner = size - safePad * 2;
  const glyphScale = Math.max(1, Math.floor(inner / 18));
  const letterWidth = 5 * glyphScale;
  const letterHeight = 7 * glyphScale;
  const gap = glyphScale * 2;
  const totalWidth = letterWidth * 2 + gap;
  const originX = Math.round((size - totalWidth) / 2);
  const originY = Math.round((size - letterHeight) / 2);
  drawLetter(png, 'E', originX, originY, glyphScale, INK);
  drawLetter(png, 'A', originX + letterWidth + gap, originY, glyphScale, ACCENT);

  return PNG.sync.write(png);
}

const targets = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'maskable-icon-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
];

for (const t of targets) {
  const buf = generate(t.size, { maskable: t.maskable });
  writeFileSync(resolve(outDir, t.name), buf);
  console.log('generated', t.name);
}
