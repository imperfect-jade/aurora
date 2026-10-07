import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const modulePath = resolve("src/lib/search/document.ts");

async function loadSearchDocument() {
  expect(existsSync(modulePath), "search document module must exist").toBe(true);
  return import(modulePath);
}

describe("metadata-only search documents", () => {
  it("indexes reader-facing metadata and headings", async () => {
    const { createSearchDocument } = await loadSearchDocument();
    const document = createSearchDocument({
      note: {
        title: "线性代数基础",
        type: "note",
        slug: "linear-algebra-basics",
        category: "courses",
        summary: "理解向量与矩阵。",
        status: "complete",
        created: "2026-09-01",
        updated: "2026-10-01",
        course: "games101",
        tags: ["数学", "图形学"],
      },
      categoryLabel: "课程笔记",
      courseTitle: "GAMES101 计算机图形学",
      headings: [
        { depth: 2, id: "vector", text: "向量运算" },
        { depth: 2, id: "matrix", text: "矩阵变换" },
      ],
      bodyHtml: "<p>正文独有词-不应进入索引</p>",
    });

    expect(document).toEqual({
      url: "/aurora/notes/linear-algebra-basics/",
      title: "线性代数基础",
      category: "课程笔记",
      course: "GAMES101 计算机图形学",
      summary: "理解向量与矩阵。",
      tags: ["数学", "图形学"],
      headings: ["向量运算", "矩阵变换"],
      searchText: "线性代数基础 课程笔记 GAMES101 计算机图形学 理解向量与矩阵。 数学 图形学 向量运算 矩阵变换",
    });
  });

  it("never includes body text or private source metadata", async () => {
    const { createSearchDocument } = await loadSearchDocument();
    const document = createSearchDocument({
      note: {
        title: "公开标题",
        type: "tool",
        slug: "public-title",
        category: "tools",
        summary: "公开摘要",
        status: "evergreen",
        created: "2026-09-01",
        updated: "2026-10-01",
      },
      categoryLabel: "工具手册",
      headings: [],
      bodyHtml: "<p>正文独有词</p>",
      sourceMetadata: {
        source_user: "私有来源词",
        source_web: "https://private.example",
      },
    });

    const serialized = JSON.stringify(document);
    expect(serialized).not.toContain("正文独有词");
    expect(serialized).not.toContain("私有来源词");
    expect(serialized).not.toContain("private.example");
  });
});
