import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const modulePath = resolve("src/lib/content/schema.ts");

const validNote = {
  title: "线性代数基础",
  type: "note",
  slug: "linear-algebra-basics",
  category: "courses",
  summary: "理解图形学所需的向量与矩阵基础。",
  status: "complete",
  created: "2026-09-01",
  updated: "2026-10-01",
  course: "games101",
  chapter: 1,
  tags: ["图形学", "数学"],
};

async function loadSchema() {
  expect(existsSync(modulePath), "content schema module must exist").toBe(true);
  return import(modulePath);
}

describe("public note schema", () => {
  it("keeps only explicitly public fields", async () => {
    const { parsePublicNote } = await loadSchema();

    expect(
      parsePublicNote(
        {
          ...validNote,
          source_user: "private attribution",
          source_web: "https://private.example",
          "source-index": "private/index",
          local_path: ["D:", "private", "note.md"].join("\\"),
        },
        ["courses"],
      ),
    ).toEqual(validNote);
  });

  it.each(["slug", "summary", "category"])(
    "rejects a note missing %s",
    async (field) => {
      const { parsePublicNote } = await loadSchema();
      const input = { ...validNote } as Record<string, unknown>;
      delete input[field];

      expect(() => parsePublicNote(input, ["courses"])).toThrow();
    },
  );

  it("rejects a non-public status", async () => {
    const { parsePublicNote } = await loadSchema();

    expect(() =>
      parsePublicNote({ ...validNote, status: "draft" }, ["courses"]),
    ).toThrow(/status/i);
  });

  it("rejects an unknown category", async () => {
    const { parsePublicNote } = await loadSchema();

    expect(() => parsePublicNote(validNote, ["tools"])).toThrow(/category/i);
  });

  it("rejects duplicate slugs across public notes", async () => {
    const { parsePublicNotes } = await loadSchema();

    expect(() =>
      parsePublicNotes(
        [validNote, { ...validNote, title: "重复笔记" }],
        ["courses"],
      ),
    ).toThrow(/duplicate slug/i);
  });
});

describe("category registry schema", () => {
  it("accepts parent categories declared earlier in the registry", async () => {
    const { parseCategoryRegistry } = await loadSchema();

    expect(
      parseCategoryRegistry([
        { id: "courses", label: "课程", order: 10 },
        { id: "graphics", label: "计算机图形学", order: 20, parent: "courses" },
      ]),
    ).toHaveLength(2);
  });

  it("rejects duplicate category ids", async () => {
    const { parseCategoryRegistry } = await loadSchema();

    expect(() =>
      parseCategoryRegistry([
        { id: "courses", label: "课程", order: 10 },
        { id: "courses", label: "重复课程", order: 20 },
      ]),
    ).toThrow(/duplicate category/i);
  });

  it("rejects an unknown parent category", async () => {
    const { parseCategoryRegistry } = await loadSchema();

    expect(() =>
      parseCategoryRegistry([
        { id: "graphics", label: "计算机图形学", order: 20, parent: "missing" },
      ]),
    ).toThrow(/parent/i);
  });

  it("rejects category parent cycles", async () => {
    const { parseCategoryRegistry } = await loadSchema();

    expect(() =>
      parseCategoryRegistry([
        { id: "courses", label: "课程", order: 10, parent: "graphics" },
        { id: "graphics", label: "计算机图形学", order: 20, parent: "courses" },
      ]),
    ).toThrow(/cycle/i);
  });

  it("loads the repository category registry", async () => {
    const { loadCategoryRegistry } = await loadSchema();

    await expect(loadCategoryRegistry("config/categories.yml")).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "courses", label: "课程笔记" }),
        expect.objectContaining({ id: "tools", label: "工具手册" }),
      ]),
    );
  });
});
