import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

async function loadSecurityModule(name: string) {
  const modulePath = resolve(`src/lib/security/${name}.ts`);
  expect(existsSync(modulePath), `${name} security module must exist`).toBe(true);
  return import(modulePath);
}

describe("sensitive text scanning", () => {
  const syntheticEmail = ["author", "example.invalid"].join("@");
  const syntheticPhone = ["138", "0013", "8000"].join("");

  it("blocks local absolute paths without exposing the path", async () => {
    const { scanSensitiveText } = await loadSecurityModule("sensitive-scan");
    const privatePath = ["D:", "private", "vault", "note.md"].join("\\");

    const findings = scanSensitiveText(`位置：${privatePath}`, "note.md");

    expect(findings).toEqual([
      expect.objectContaining({
        ruleId: "local-absolute-path",
        file: "note.md",
        excerpt: expect.stringContaining("[REDACTED]"),
      }),
    ]);
    expect(JSON.stringify(findings)).not.toContain(privatePath);
  });

  it("does not mistake a relative home-named module path for an absolute user path", async () => {
    const { scanSensitiveText } = await loadSecurityModule("sensitive-scan");

    expect(scanSensitiveText('import Scene from "../components/home/Scene.astro";', "source.ts")).toEqual([]);
  });

  it("blocks token-shaped secrets without exposing their value", async () => {
    const { scanSensitiveText } = await loadSecurityModule("sensitive-scan");
    const syntheticToken = ["ghp", "_", "A".repeat(36)].join("");

    const findings = scanSensitiveText(`token=${syntheticToken}`, "note.md");

    expect(findings[0]?.ruleId).toBe("credential-token");
    expect(JSON.stringify(findings)).not.toContain(syntheticToken);
  });

  it.each([
    [syntheticEmail, "email-address"],
    [syntheticPhone, "mainland-phone-number"],
  ])("blocks personal information pattern %s", async (value, ruleId) => {
    const { scanSensitiveText } = await loadSecurityModule("sensitive-scan");

    const findings = scanSensitiveText(`联系人：${value}`, "note.md");

    expect(findings[0]?.ruleId).toBe(ruleId);
    expect(JSON.stringify(findings)).not.toContain(value);
  });
});

describe("raw HTML policy", () => {
  it("keeps safe disclosure markup", async () => {
    const { assertSafeHtml } = await loadSecurityModule("html-policy");
    const html = "<details><summary>说明</summary><p>安全内容</p></details>";

    expect(assertSafeHtml(html, [])).toBe(html);
  });

  it.each([
    "<script>alert(1)</script>",
    "<object data=\"/file\"></object>",
    "<embed src=\"/file\">",
    "<button onclick=\"alert(1)\">运行</button>",
    "<a href=\"javascript:alert(1)\">运行</a>",
  ])("rejects dangerous markup", async (html) => {
    const { assertSafeHtml } = await loadSecurityModule("html-policy");

    expect(() => assertSafeHtml(html, [])).toThrow(/unsafe html/i);
  });

  it("allows only explicitly configured iframe hosts", async () => {
    const { assertSafeHtml } = await loadSecurityModule("html-policy");
    const html = '<iframe src="https://player.example.invalid/embed/lesson"></iframe>';

    expect(() => assertSafeHtml(html, [])).toThrow(/iframe/i);
    expect(assertSafeHtml(html, ["player.example.invalid"])).toBe(html);
  });
});

describe("public output boundary", () => {
  it("rejects paths that escape the configured root", async () => {
    const { assertPathWithinRoot } = await loadSecurityModule("public-content");
    const root = resolve("tests/fixtures/public-root");

    expect(() => assertPathWithinRoot(root, resolve(root, "..", "private.md"))).toThrow(
      /path escape/i,
    );
  });

  it("builds output from an allowlist instead of copying source metadata", async () => {
    const { createPublicContent } = await loadSecurityModule("public-content");

    const output = createPublicContent(
      {
        title: "Linux 命令行",
        type: "tool",
        slug: "linux-cli",
        category: "tools",
        summary: "常用命令与排错方法。",
        status: "evergreen",
        created: "2026-09-01",
        updated: "2026-10-01",
        tags: ["Linux"],
        source_user: "private",
        source_web: "https://private.example",
        extra: "private",
      },
      ["tools"],
      "<h2 id=\"files\">文件</h2><p>正文</p>",
      [{ depth: 2, id: "files", text: "文件" }],
    );

    expect(output).toEqual({
      title: "Linux 命令行",
      type: "tool",
      slug: "linux-cli",
      category: "tools",
      summary: "常用命令与排错方法。",
      status: "evergreen",
      created: "2026-09-01",
      updated: "2026-10-01",
      tags: ["Linux"],
      bodyHtml: "<h2 id=\"files\">文件</h2><p>正文</p>",
      headings: [{ depth: 2, id: "files", text: "文件" }],
    });
  });
});
