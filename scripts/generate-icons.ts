import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// CRC32 table & calculation for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

interface RenderOptions {
  width: number;
  height: number;
  isMaskable?: boolean;
  cornerRadius?: number;
}

// Draw pixel logic for SAMI shield logo
function renderSamiIconBuffer(options: RenderOptions): Buffer {
  const { width, height, isMaskable = false, cornerRadius = 0 } = options;
  const bgR = 79, bgG = 70, bgB = 229; // #4F46E5

  // Scale factor based on standard 512 canvas
  const s = width / 512;
  const scale = isMaskable ? 0.76 : 0.88;
  const cx = width / 2;
  const cy = height / 2;

  // RGBA buffer with 1 extra filter byte per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Check rounded corner for non-maskable icons if cornerRadius > 0
      let inCard = true;
      if (cornerRadius > 0 && !isMaskable) {
        const r = cornerRadius;
        const inCornerX = x < r ? r - x : (x > width - r ? x - (width - r) : 0);
        const inCornerY = y < r ? r - y : (y > height - r ? y - (height - r) : 0);
        if (inCornerX > 0 && inCornerY > 0) {
          if (inCornerX * inCornerX + inCornerY * inCornerY > r * r) {
            inCard = false;
          }
        }
      }

      if (!inCard) {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
        continue;
      }

      // Default background is indigo
      let r = bgR, g = bgG, b = bgB, a = 255;

      // Transform (x, y) relative to center in 512 canvas coordinates
      const nx = (x - cx) / (s * scale);
      const ny = (y - cy) / (s * scale);

      // Check if inside Shield
      // Center of shield at (0, -10)
      const sy = ny + 10;
      const sx = Math.abs(nx);

      let inShield = false;
      const topY = -120;
      const shoulderY = -95;
      const curveStartY = 15;
      const bottomY = 135;
      const halfW = 100;

      if (sy >= topY && sy <= bottomY) {
        if (sy <= shoulderY) {
          // Top curved rim
          const t = (shoulderY - sy) / (shoulderY - topY);
          const maxW = halfW - t * 20;
          inShield = sx <= maxW && (sy >= topY + (sx / halfW) * 12);
        } else if (sy <= curveStartY) {
          // Straight sides
          inShield = sx <= halfW;
        } else {
          // Bottom curved taper to tip
          const t = (sy - curveStartY) / (bottomY - curveStartY);
          // Parabolic taper
          const maxW = halfW * (1 - Math.pow(t, 1.45));
          inShield = sx <= Math.max(0, maxW);
        }
      }

      if (inShield) {
        // Shield interior is white
        r = 255;
        g = 255;
        b = 255;

        // Check if inside one of the 3 ascending bars
        // Bar 1: x in [-52, -22], y in [10, 65]
        // Bar 2: x in [-15, 15],  y in [-25, 65]
        // Bar 3: x in [22, 52],   y in [-60, 65]
        const barRadius = 6;
        const checkBar = (bx1: number, bx2: number, by1: number, by2: number) => {
          if (nx >= bx1 && nx <= bx2 && sy >= by1 && sy <= by2) {
            // Check rounded corners for the bar
            const cx1 = bx1 + barRadius;
            const cx2 = bx2 - barRadius;
            const cy1 = by1 + barRadius;
            const cy2 = by2 - barRadius;
            if (nx < cx1 && sy < cy1) {
              const dx = cx1 - nx, dy = cy1 - sy;
              return dx * dx + dy * dy <= barRadius * barRadius;
            }
            if (nx > cx2 && sy < cy1) {
              const dx = nx - cx2, dy = cy1 - sy;
              return dx * dx + dy * dy <= barRadius * barRadius;
            }
            if (nx < cx1 && sy > cy2) {
              const dx = cx1 - nx, dy = sy - cy2;
              return dx * dx + dy * dy <= barRadius * barRadius;
            }
            if (nx > cx2 && sy > cy2) {
              const dx = nx - cx2, dy = sy - cy2;
              return dx * dx + dy * dy <= barRadius * barRadius;
            }
            return true;
          }
          return false;
        };

        const inBar1 = checkBar(-52, -22, 10, 65);
        const inBar2 = checkBar(-15, 15, -25, 65);
        const inBar3 = checkBar(22, 52, -60, 65);

        if (inBar1 || inBar2 || inBar3) {
          // Bars are Indigo #4F46E5
          r = bgR;
          g = bgG;
          b = bgB;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Deflate raw scanlines
  const compressed = zlib.deflateSync(rawData, { level: 9 });

  // Construct PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Standard filter
  ihdrData[12] = 0; // No interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate files
const iconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. icon-512.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="samiBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4F46E5" />
      <stop offset="100%" stop-color="#4338CA" />
    </linearGradient>
  </defs>
  <!-- Background with subtle corner rounding -->
  <rect width="512" height="512" rx="100" fill="url(#samiBg)" />
  
  <!-- White Shield Container -->
  <path d="M 256 126 C 290 126 346 138 356 151 C 356 195 356 250 356 261 C 356 325 305 365 256 391 C 207 365 156 325 156 261 C 156 250 156 195 156 151 C 166 138 222 126 256 126 Z" 
        fill="#FFFFFF" />
        
  <!-- Ascending Fintech Growth Bars in Indigo -->
  <!-- Bar 1 (Left / Base Level) -->
  <rect x="194" y="260" width="30" height="55" rx="6" fill="#4F46E5" />
  <!-- Bar 2 (Center / Growth Level) -->
  <rect x="241" y="225" width="30" height="90" rx="6" fill="#4F46E5" />
  <!-- Bar 3 (Right / Target Peak Level) -->
  <rect x="288" y="190" width="30" height="125" rx="6" fill="#4F46E5" />
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svgContent, 'utf-8');
console.log('✓ Generated public/icons/icon-512.svg');

// 2. icon-192.png
const png192 = renderSamiIconBuffer({ width: 192, height: 192, cornerRadius: 36 });
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), png192);
console.log('✓ Generated public/icons/icon-192.png (192x192)');

// 3. icon-512.png
const png512 = renderSamiIconBuffer({ width: 512, height: 512, cornerRadius: 96 });
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), png512);
console.log('✓ Generated public/icons/icon-512.png (512x512)');

// 4. icon-maskable-512.png (Safe zone within 80% circle, 0 corner radius, full bleed background)
const pngMaskable512 = renderSamiIconBuffer({ width: 512, height: 512, isMaskable: true, cornerRadius: 0 });
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512.png'), pngMaskable512);
console.log('✓ Generated public/icons/icon-maskable-512.png (512x512 maskable)');

// 5. apple-touch-icon-180.png (180x180 PNG required by iOS Safari)
const pngApple180 = renderSamiIconBuffer({ width: 180, height: 180, cornerRadius: 0 });
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon-180.png'), pngApple180);
console.log('✓ Generated public/icons/apple-touch-icon-180.png (180x180)');
