import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const modulePath = resolve("src/lib/sync/sync-public-notes.ts");
const temporaryDirectories: string[] = [];

async function loadSync() {
  expect(existsSync(modulePath), "sync module must exist").toBe(true);
  return import(modulePath);
}

async function makeTempDirectory(prefix: string) {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

async function writeNote(path: string, frontmatter: string, body: string) {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, `---\n${frontmatter}\n---\n\n${body}\n`, "utf8");
}

async function fileFingerprint(path: string) {
  const content = await readFile(path);
  const metadata = await stat(path);
  return {
    hash: createHash("sha256").update(content).digest("hex"),
    modified: metadata.mtimeMs,
  };
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("public Vault synchronization", () => {
  it("reads only published notes, preserves the Vault, and copies only referenced assets", async () => {
    const { syncPublicNotes } = await loadSync();
    const vaultRoot = await makeTempDirectory("aurora-vault-");
    const repoRoot = await makeTempDirectory("aurora-repo-");
    const mocPath = join(vaultRoot, "40 Published", "Courses", "GAMES101.md");
    const chapterPath = join(vaultRoot, "40 Published", "Courses", "线性代数.md");
    const privatePath = join(vaultRoot, "10 Inbox", "私人草稿.md");
    const attachments = join(vaultRoot, "90 Attachments");

    await writeNote(
      mocPath,
      [
        "title: GAMES101 计算机图形学",
        "type: course-moc",
        "slug: games101",
        "category: courses",
        "summary: 从线性代数到光线追踪的课程笔记。",
        "status: complete",
        "created: 2026-09-01",
        "updated: 2026-10-01",
      ].join("\n"),
      "# GAMES101\n\n[[线性代数基础]]",
    );
    await writeNote(
      chapterPath,
      [
        "title: 线性代数基础",
        "type: note",
        "slug: linear-algebra-basics",
        "category: courses",
        "summary: 向量与矩阵基础。",
        "status: evergreen",
        "created: 2026-09-02",
        "updated: 2026-10-02",
        "course: games101",
        "chapter: 1",
      ].join("\n"),
      "# 线性代数基础\n\n![[vector.svg|向量示意图]]",
    );
    await writeNote(
      privatePath,
      "title: 私人草稿\nstatus: draft",
      "不得公开",
    );
    await mkdir(attachments, { recursive: true });
    await writeFile(
      join(attachments, "vector.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M1 9 9 1"/></svg>',
      "utf8",
    );
    await writeFile(join(attachments, "unused.svg"), "<svg></svg>", "utf8");

    const before = {
      moc: await fileFingerprint(mocPath),
      chapter: await fileFingerprint(chapterPath),
      private: await fileFingerprint(privatePath),
    };
    const first = await syncPublicNotes({ vaultRoot, repoRoot });
    const second = await syncPublicNotes({ vaultRoot, repoRoot });

    expect(first.written).toEqual(["games101", "linear-algebra-basics"]);
    expect(second.written).toEqual([]);
    expect(second.unchanged).toEqual(["games101", "linear-algebra-basics"]);
    expect(await readdir(join(repoRoot, "src", "generated", "notes"))).toEqual([
      "games101.md",
      "linear-algebra-basics.md",
    ]);
    expect(await readdir(join(repoRoot, "public", "media"))).toEqual([
      expect.stringMatching(/^[a-f0-9]{12}-vector\.svg$/),
    ]);
    expect(await readFile(join(repoRoot, "src", "generated", "notes", "linear-algebra-basics.md"), "utf8"))
      .toMatch(/\/aurora\/media\/[a-f0-9]{12}-vector\.svg/);
    expect(existsSync(join(repoRoot, "src", "generated", "notes", "私人草稿.md"))).toBe(false);
    expect({
      moc: await fileFingerprint(mocPath),
      chapter: await fileFingerprint(chapterPath),
      private: await fileFingerprint(privatePath),
    }).toEqual(before);
  });

  it("blocks a missing referenced attachment before replacing generated output", async () => {
    const { syncPublicNotes } = await loadSync();
    const vaultRoot = await makeTempDirectory("aurora-vault-");
    const repoRoot = await makeTempDirectory("aurora-repo-");
    const notePath = join(vaultRoot, "40 Published", "Tools", "工具.md");
    await writeNote(
      notePath,
      "title: 工具\ntype: tool\nslug: tool\ncategory: tools\nsummary: 工具说明。\nstatus: complete\ncreated: 2026-09-01\nupdated: 2026-10-01",
      "![[missing.png]]",
    );

    await expect(syncPublicNotes({ vaultRoot, repoRoot })).rejects.toThrow(/missing asset/i);
    expect(existsSync(join(repoRoot, "src", "generated"))).toBe(false);
  });

  it("blocks ambiguous attachment names", async () => {
    const { syncPublicNotes } = await loadSync();
    const vaultRoot = await makeTempDirectory("aurora-vault-");
    const repoRoot = await makeTempDirectory("aurora-repo-");
    await writeNote(
      join(vaultRoot, "40 Published", "Tools", "工具.md"),
      "title: 工具\ntype: tool\nslug: tool\ncategory: tools\nsummary: 工具说明。\nstatus: complete\ncreated: 2026-09-01\nupdated: 2026-10-01",
      "![[same.svg]]",
    );
    await mkdir(join(vaultRoot, "90 Attachments", "a"), { recursive: true });
    await mkdir(join(vaultRoot, "90 Attachments", "b"), { recursive: true });
    await writeFile(join(vaultRoot, "90 Attachments", "a", "same.svg"), "<svg></svg>");
    await writeFile(join(vaultRoot, "90 Attachments", "b", "same.svg"), "<svg></svg>");

    await expect(syncPublicNotes({ vaultRoot, repoRoot })).rejects.toThrow(/ambiguous asset/i);
  });

  it("blocks damaged raster assets", async () => {
    const { syncPublicNotes } = await loadSync();
    const vaultRoot = await makeTempDirectory("aurora-vault-");
    const repoRoot = await makeTempDirectory("aurora-repo-");
    await writeNote(
      join(vaultRoot, "40 Published", "Tools", "工具.md"),
      "title: 工具\ntype: tool\nslug: tool\ncategory: tools\nsummary: 工具说明。\nstatus: complete\ncreated: 2026-09-01\nupdated: 2026-10-01",
      "![[broken.png]]",
    );
    await mkdir(join(vaultRoot, "90 Attachments"), { recursive: true });
    await writeFile(join(vaultRoot, "90 Attachments", "broken.png"), "not an image");

    await expect(syncPublicNotes({ vaultRoot, repoRoot })).rejects.toThrow(/damaged asset/i);
  });
});
