import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '../assets/logo.svg');

const targets = [
  { out: join(__dirname, '../assets/images/icon.png'),          size: 1024 },
  { out: join(__dirname, '../assets/images/adaptive-icon.png'), size: 1024, pad: 80 },
  { out: join(__dirname, '../assets/images/splash-icon.png'),   size: 1024 },
  { out: join(__dirname, '../assets/images/favicon.png'),       size: 48  },
];

for (const { out, size, pad = 0 } of targets) {
  try {
    const innerSize = size - pad * 2;
    let pipeline = sharp(src).resize(innerSize, innerSize);
    if (pad > 0) {
      pipeline = pipeline.extend({
        top: pad, bottom: pad, left: pad, right: pad,
        background: { r: 250, g: 247, b: 242, alpha: 1 },
      });
    }
    await pipeline.png().toFile(out);
    console.log(`✓ ${out}`);
  } catch (err) {
    console.error(`✗ ${out}: ${err.message}`);
    process.exit(1);
  }
}
