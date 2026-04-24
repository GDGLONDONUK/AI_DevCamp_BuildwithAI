/**
 * Build square favicons from public/logo.png (center cover crop + resize).
 * Run from repo root: npm run generate-favicons
 */

import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const logoPath = path.join(root, "public", "logo.png");
const publicDir = path.join(root, "public");

async function main() {
  const sizes = [16, 32, 48] as const;
  for (const s of sizes) {
    const out = path.join(publicDir, `favicon-${s}x${s}.png`);
    await sharp(logoPath)
      .resize(s, s, { fit: "cover", position: "centre" })
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log("Wrote", path.relative(root, out));
  }

  const appleOut = path.join(publicDir, "apple-touch-icon.png");
  await sharp(logoPath)
    .resize(180, 180, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(appleOut);
  console.log("Wrote", path.relative(root, appleOut));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
