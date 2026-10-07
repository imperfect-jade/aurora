import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Astro deployment configuration", () => {
  it("builds canonical URLs for the Aurora GitHub Pages project", async () => {
    const configPath = resolve("astro.config.mjs");

    expect(existsSync(configPath), "astro.config.mjs must exist").toBe(true);

    const { default: config } = await import(configPath);
    expect(config.site).toBe("https://imperfect-jade.github.io");
    expect(config.base).toBe("/aurora");
  });
});
