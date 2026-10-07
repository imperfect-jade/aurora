import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const assets = [
  {
    url: "https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png",
    output: "earth-blue-marble.webp",
  },
  {
    url: "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg",
    output: "moon-lroc.webp",
  },
];

const outputDirectory = resolve("public/assets/celestial");
await mkdir(outputDirectory, { recursive: true });

for (const asset of assets) {
  const response = await fetch(asset.url);
  if (!response.ok) throw new Error(`Failed to download ${asset.url}: ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  const optimized = await sharp(source)
    .resize({ width: 2048, withoutEnlargement: true })
    .webp({ quality: 86, effort: 5 })
    .toBuffer();
  await writeFile(resolve(outputDirectory, asset.output), optimized);
  console.log(`${asset.output}: ${optimized.length} bytes`);
}
