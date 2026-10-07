import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { loadCategoryRegistry, parsePublicNotes, type PublicNote } from "../content/schema";
import { transformMarkdown } from "../markdown/pipeline";
import { assertPathWithinRoot } from "../security/public-content";
import { buildAttachmentIndex, rewriteReferencedAssets } from "./assets";
import { parseFrontmatter, serializePublicMarkdown } from "./frontmatter";

const publishedDirectories = [
  join("40 Published", "Courses"),
  join("40 Published", "Reviews"),
  join("40 Published", "Tools"),
];
const pipelineVersion = "aurora-sync-v1";

interface SourceNote {
  path: string;
  raw: string;
  body: string;
  data: Record<string, unknown>;
  parsed: PublicNote;
}

interface ManifestEntry {
  fingerprint: string;
  outputHash: string;
  assets: string[];
}

interface SyncManifest {
  version: 1;
  notes: Record<string, ManifestEntry>;
}

export interface SyncOptions {
  vaultRoot: string;
  repoRoot: string;
  basePath?: string;
  categoryFile?: string;
}

export interface SyncResult {
  written: string[];
  unchanged: string[];
  removed: string[];
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root: string, extension?: string): Promise<string[]> {
  if (!(await pathExists(root))) return [];
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(entry.parentPath, entry.name))
    .filter((path) => !extension || extname(path).toLowerCase() === extension)
    .sort();
}

async function readManifest(path: string): Promise<SyncManifest> {
  if (!(await pathExists(path))) return { version: 1, notes: {} };
  return JSON.parse(await readFile(path, "utf8")) as SyncManifest;
}

async function replaceDirectoryAtomically(stage: string, target: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  const backup = `${target}.backup-${process.pid}`;
  const targetExists = await pathExists(target);
  if (targetExists) await rename(target, backup);

  try {
    await rename(stage, target);
    if (targetExists) await rm(backup, { recursive: true, force: true });
  } catch (error) {
    if (targetExists && (await pathExists(backup))) await rename(backup, target);
    throw error;
  }
}

function noteFingerprint(source: SourceNote, processedMarkdown: string): string {
  return createHash("sha256")
    .update(pipelineVersion)
    .update(source.raw)
    .update(processedMarkdown)
    .digest("hex");
}

export async function syncPublicNotes(options: SyncOptions): Promise<SyncResult> {
  const vaultRoot = resolve(options.vaultRoot);
  const repoRoot = resolve(options.repoRoot);
  const basePath = options.basePath ?? "/aurora";
  const categoryFile = options.categoryFile ?? resolve("config/categories.yml");
  const categoryIds = (await loadCategoryRegistry(categoryFile)).map((category) => category.id);
  const notePaths = (
    await Promise.all(
      publishedDirectories.map((directory) => {
        const absolute = assertPathWithinRoot(vaultRoot, join(vaultRoot, directory));
        return listFiles(absolute, ".md");
      }),
    )
  ).flat();

  const rawNotes = await Promise.all(
    notePaths.map(async (path) => {
      assertPathWithinRoot(vaultRoot, path);
      const raw = await readFile(path, "utf8");
      const parsedFile = parseFrontmatter(raw);
      return { path, raw, ...parsedFile };
    }),
  );
  const publicNotes = parsePublicNotes(
    rawNotes.map((note) => note.data),
    categoryIds,
  );
  const sources: SourceNote[] = rawNotes.map((source, index) => ({
    ...source,
    parsed: publicNotes[index],
  }));

  const attachmentRoot = assertPathWithinRoot(
    vaultRoot,
    join(vaultRoot, "90 Attachments"),
  );
  const attachmentFiles = await listFiles(attachmentRoot);
  const attachmentIndex = await buildAttachmentIndex(attachmentRoot, attachmentFiles);
  const stageRoot = join(repoRoot, `.aurora-sync-stage-${process.pid}-${Date.now()}`);
  const stageNotes = join(stageRoot, "notes");
  const stageMedia = join(stageRoot, "media");
  const notesTarget = join(repoRoot, "src", "generated", "notes");
  const mediaTarget = join(repoRoot, "public", "media");
  const manifestPath = join(repoRoot, "src", "generated", "sync-manifest.json");
  const previousManifest = await readManifest(manifestPath);

  try {
    await mkdir(stageNotes, { recursive: true });
    await mkdir(stageMedia, { recursive: true });
    const rewritten = new Map<string, { markdown: string; assets: string[] }>();
    for (const source of sources) {
      rewritten.set(
        source.parsed.slug,
        await rewriteReferencedAssets(source.body, {
          attachmentRoot,
          attachmentIndex,
          stageMediaDirectory: stageMedia,
          basePath,
        }),
      );
    }

    const markdownSources = sources.map((source) => ({
      title: source.parsed.title,
      slug: source.parsed.slug,
      markdown: rewritten.get(source.parsed.slug)?.markdown ?? source.body,
    }));
    const nextManifest: SyncManifest = { version: 1, notes: {} };
    const written: string[] = [];
    const unchanged: string[] = [];

    for (const source of sources) {
      const processed = rewritten.get(source.parsed.slug);
      if (!processed) throw new Error(`Internal sync error for ${source.parsed.slug}`);
      const transformed = await transformMarkdown(processed.markdown, {
        currentSlug: source.parsed.slug,
        notes: markdownSources,
        basePath,
      });
      const publicData = { ...source.parsed } as Record<string, unknown>;
      const output = serializePublicMarkdown(publicData, transformed.html);
      const outputHash = createHash("sha256").update(output).digest("hex");
      const fingerprint = noteFingerprint(source, processed.markdown);
      nextManifest.notes[source.parsed.slug] = {
        fingerprint,
        outputHash,
        assets: processed.assets,
      };
      await writeFile(join(stageNotes, `${source.parsed.slug}.md`), output, "utf8");

      if (previousManifest.notes[source.parsed.slug]?.fingerprint === fingerprint) {
        unchanged.push(source.parsed.slug);
      } else {
        written.push(source.parsed.slug);
      }
    }

    const removed = Object.keys(previousManifest.notes).filter(
      (slug) => !nextManifest.notes[slug],
    );
    await replaceDirectoryAtomically(stageNotes, notesTarget);
    await replaceDirectoryAtomically(stageMedia, mediaTarget);
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
    await rm(stageRoot, { recursive: true, force: true });

    return {
      written: written.sort(),
      unchanged: unchanged.sort(),
      removed: removed.sort(),
    };
  } catch (error) {
    await rm(stageRoot, { recursive: true, force: true });
    throw error;
  }
}
