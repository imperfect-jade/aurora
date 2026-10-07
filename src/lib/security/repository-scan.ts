import { readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { assertPathWithinRoot } from "./public-content.ts";
import { scanSensitiveText, type SensitiveFinding } from "./sensitive-scan.ts";

const textExtensions = new Set([
  ".astro", ".css", ".html", ".js", ".json", ".md", ".mjs", ".txt", ".ts", ".yaml", ".yml",
]);

function displayPath(root: string, path: string): string {
  return relative(resolve(root), path).replaceAll("\\", "/");
}

export async function scanRepositoryFiles(root: string, paths: readonly string[]): Promise<SensitiveFinding[]> {
  const findings: SensitiveFinding[] = [];
  for (const candidate of paths) {
    if (!textExtensions.has(extname(candidate).toLowerCase())) continue;
    const absolute = assertPathWithinRoot(root, resolve(root, candidate));
    const source = await readFile(absolute, "utf8");
    findings.push(...scanSensitiveText(source, displayPath(root, absolute)));
  }
  return findings;
}
