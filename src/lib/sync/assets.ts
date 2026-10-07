import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import sharp from "sharp";
import { assertPathWithinRoot } from "../security/public-content";

const obsidianImagePattern = /!\[\[([^\]|]+\.(?:avif|gif|jpe?g|png|svg|webp))(?:\|([^\]]+))?\]\]/gi;
const rasterExtensions = new Set([".avif", ".gif", ".jpg", ".jpeg", ".png", ".webp"]);

export interface AssetContext {
  attachmentRoot: string;
  attachmentIndex: Map<string, string[]>;
  stageMediaDirectory: string;
  basePath: string;
}

async function outputAsset(sourcePath: string, context: AssetContext): Promise<string> {
  const source = await readFile(assertPathWithinRoot(context.attachmentRoot, sourcePath));
  const sourceName = basename(sourcePath);
  const sourceExtension = extname(sourceName).toLowerCase();
  const digest = createHash("sha256").update(source).digest("hex").slice(0, 12);
  await mkdir(context.stageMediaDirectory, { recursive: true });

  if (sourceExtension === ".svg") {
    const outputName = `${digest}-${sourceName}`;
    await copyFile(sourcePath, join(context.stageMediaDirectory, outputName));
    return outputName;
  }

  if (!rasterExtensions.has(sourceExtension)) {
    throw new Error(`Unsupported asset type: ${sourceName}`);
  }

  const stem = sourceName.slice(0, -sourceExtension.length).replace(/[^a-zA-Z0-9._-]+/g, "-");
  const outputName = `${digest}-${stem}.webp`;
  try {
    await sharp(source)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(join(context.stageMediaDirectory, outputName));
  } catch {
    throw new Error(`Damaged asset blocked: ${sourceName}`);
  }
  return outputName;
}

export async function rewriteReferencedAssets(
  markdown: string,
  context: AssetContext,
): Promise<{ markdown: string; assets: string[] }> {
  let output = "";
  let lastIndex = 0;
  const assets = new Set<string>();

  for (const match of markdown.matchAll(obsidianImagePattern)) {
    output += markdown.slice(lastIndex, match.index);
    const requested = basename(match[1].replaceAll("\\", "/"));
    const candidates = context.attachmentIndex.get(requested.toLowerCase()) ?? [];
    if (candidates.length === 0) throw new Error(`Missing asset: ${requested}`);
    if (candidates.length > 1) throw new Error(`Ambiguous asset: ${requested}`);

    const outputName = await outputAsset(candidates[0], context);
    assets.add(outputName);
    const alt = match[2]?.trim() || requested.replace(extname(requested), "");
    output += `![${alt}](${context.basePath}/media/${outputName})`;
    lastIndex = match.index + match[0].length;
  }

  output += markdown.slice(lastIndex);
  return { markdown: output, assets: [...assets].sort() };
}

export async function buildAttachmentIndex(
  attachmentRoot: string,
  files: readonly string[],
): Promise<Map<string, string[]>> {
  const index = new Map<string, string[]>();
  for (const file of files) {
    assertPathWithinRoot(attachmentRoot, file);
    const key = basename(file).toLowerCase();
    index.set(key, [...(index.get(key) ?? []), file]);
  }
  return index;
}
