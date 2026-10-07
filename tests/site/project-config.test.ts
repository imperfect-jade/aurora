import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string): string {
  const absolute = resolve(path);
  expect(existsSync(absolute), `${path} must exist`).toBe(true);
  return readFileSync(absolute, "utf8");
}

describe("static-site release configuration", () => {
  it("publishes robots and a generated sitemap under the repository base path", () => {
    expect(read("public/robots.txt")).toContain("https://imperfect-jade.github.io/aurora/sitemap.xml");
    const sitemap = read("src/pages/sitemap.xml.ts");
    expect(sitemap).toContain("getCollection");
    expect(sitemap).toContain("application/xml");
  });

  it("runs verification in CI while keeping Pages deployment manually dispatched", () => {
    const ci = read(".github/workflows/ci.yml");
    expect(ci).toContain("pull_request:");
    expect(ci).toContain("npm run validate");
    expect(ci).toContain("npm run test:e2e");

    const deploy = read(".github/workflows/deploy.yml");
    expect(deploy).toContain("workflow_dispatch:");
    expect(deploy).not.toMatch(/\n\s+push:/);
    expect(deploy).toContain("pages: write");
    expect(deploy).toContain("id-token: write");
    expect(deploy).toContain("actions/deploy-pages");
  });
});
