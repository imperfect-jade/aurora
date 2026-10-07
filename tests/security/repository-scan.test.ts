import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const modulePath = resolve("src/lib/security/repository-scan.ts");

describe("repository text scanning", () => {
  it("returns only relative paths and redacted excerpts", async () => {
    expect(existsSync(modulePath), "repository scanner module must exist").toBe(true);
    const { scanRepositoryFiles } = await import(modulePath);
    const root = await mkdtemp(join(tmpdir(), "aurora-repo-scan-"));
    await mkdir(join(root, "notes"));
    const syntheticToken = ["ghp", "_", "Z".repeat(36)].join("");
    await writeFile(join(root, "notes", "unsafe.md"), `token=${syntheticToken}`);
    await writeFile(join(root, "notes", "safe.ts"), 'import Scene from "../components/home/Scene.astro";');

    const findings = await scanRepositoryFiles(root, ["notes/unsafe.md", "notes/safe.ts"]);

    expect(findings).toEqual([
      expect.objectContaining({ file: "notes/unsafe.md", ruleId: "credential-token" }),
    ]);
    expect(JSON.stringify(findings)).not.toContain(syntheticToken);
    expect(JSON.stringify(findings)).not.toContain(root);
  });
});
