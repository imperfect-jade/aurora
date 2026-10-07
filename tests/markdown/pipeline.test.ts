import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const modulePath = resolve("src/lib/markdown/pipeline.ts");

async function loadPipeline() {
  expect(existsSync(modulePath), "Markdown pipeline must exist").toBe(true);
  return import(modulePath);
}

describe("Obsidian Markdown pipeline", () => {
  it("resolves public wiki links and heading anchors", async () => {
    const { transformMarkdown } = await loadPipeline();
    const result = await transformMarkdown(
      "阅读 [[目标笔记#目标章节|这一节]]。",
      {
        currentSlug: "current-note",
        notes: [
          { title: "目标笔记", slug: "target-note", markdown: "# 目标笔记\n## 目标章节\n正文" },
        ],
      },
    );

    expect(result.html).toContain(
      'href="/aurora/notes/target-note/#%E7%9B%AE%E6%A0%87%E7%AB%A0%E8%8A%82"',
    );
    expect(result.html).toContain("这一节");
    expect(result.linkedSlugs).toEqual(["target-note"]);
  });

  it("blocks a wiki link to an unpublished note", async () => {
    const { transformMarkdown } = await loadPipeline();

    await expect(
      transformMarkdown("[[未发布笔记]]", { currentSlug: "current", notes: [] }),
    ).rejects.toThrow(/unpublished/i);
  });

  it("renders an Obsidian callout as a semantic aside", async () => {
    const { transformMarkdown } = await loadPipeline();
    const result = await transformMarkdown(
      "> [!note] 关键结论\n> 这里是正文。",
      { currentSlug: "callout", notes: [] },
    );

    expect(result.html).toContain('<aside class="callout callout-note"');
    expect(result.html).toContain("关键结论");
    expect(result.html).toContain("这里是正文");
  });

  it("renders tables, footnotes, fenced code, math, and Mermaid", async () => {
    const { transformMarkdown } = await loadPipeline();
    const result = await transformMarkdown(
      [
        "| A | B |",
        "| - | - |",
        "| 1 | 2 |",
        "",
        "脚注[^1]",
        "",
        "[^1]: 说明",
        "",
        "```ts",
        "const answer = 42;",
        "```",
        "",
        "行内公式 $E=mc^2$。",
        "",
        "```mermaid",
        "flowchart LR",
        "A --> B",
        "```",
      ].join("\n"),
      { currentSlug: "features", notes: [] },
    );

    expect(result.html).toContain("<table>");
    expect(result.html).toContain("data-footnote-ref");
    expect(result.html).toContain('class="language-ts"');
    expect(result.html).toContain('class="katex"');
    expect(result.html).toContain('class="language-mermaid"');
  });

  it("embeds only the requested section", async () => {
    const { transformMarkdown } = await loadPipeline();
    const result = await transformMarkdown("![[目标笔记#目标章节]]", {
      currentSlug: "current",
      notes: [
        {
          title: "目标笔记",
          slug: "target-note",
          markdown: "# 目标笔记\n引言\n## 目标章节\n需要嵌入\n## 其他章节\n不应嵌入",
        },
      ],
    });

    expect(result.html).toContain("需要嵌入");
    expect(result.html).not.toContain("不应嵌入");
  });

  it("blocks a missing embedded section", async () => {
    const { transformMarkdown } = await loadPipeline();

    await expect(
      transformMarkdown("![[目标笔记#不存在]]", {
        currentSlug: "current",
        notes: [{ title: "目标笔记", slug: "target-note", markdown: "# 目标笔记" }],
      }),
    ).rejects.toThrow(/section/i);
  });

  it("blocks recursive note embeds", async () => {
    const { transformMarkdown } = await loadPipeline();

    await expect(
      transformMarkdown("![[笔记 B]]", {
        currentSlug: "note-a",
        notes: [
          { title: "笔记 A", slug: "note-a", markdown: "![[笔记 B]]" },
          { title: "笔记 B", slug: "note-b", markdown: "![[笔记 A]]" },
        ],
      }),
    ).rejects.toThrow(/recursive embed/i);
  });

  it("preserves safe raw HTML and blocks unsafe raw HTML", async () => {
    const { transformMarkdown } = await loadPipeline();
    const safe = await transformMarkdown(
      "<details><summary>展开</summary><p>内容</p></details>",
      { currentSlug: "html", notes: [] },
    );

    expect(safe.html).toContain("<details>");
    await expect(
      transformMarkdown("<script>alert(1)</script>", {
        currentSlug: "html",
        notes: [],
      }),
    ).rejects.toThrow(/unsafe html/i);
  });

  it("returns stable heading metadata for the reader table of contents", async () => {
    const { transformMarkdown } = await loadPipeline();
    const result = await transformMarkdown("# 标题\n## 第一节\n### 细节", {
      currentSlug: "headings",
      notes: [],
    });

    expect(result.headings).toEqual([
      { depth: 1, id: "标题", text: "标题" },
      { depth: 2, id: "第一节", text: "第一节" },
      { depth: 3, id: "细节", text: "细节" },
    ]);
  });
});
