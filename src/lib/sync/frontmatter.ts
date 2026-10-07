import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface ParsedMarkdownFile {
  data: Record<string, unknown>;
  body: string;
}

export function parseFrontmatter(source: string): ParsedMarkdownFile {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error("Missing YAML frontmatter");
  }

  const closing = normalized.indexOf("\n---\n", 4);
  if (closing === -1) {
    throw new Error("Unclosed YAML frontmatter");
  }

  const parsed = parseYaml(normalized.slice(4, closing));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Frontmatter must be a YAML object");
  }

  return {
    data: parsed as Record<string, unknown>,
    body: normalized.slice(closing + 5).replace(/^\n/, ""),
  };
}

export function serializePublicMarkdown(
  data: Record<string, unknown>,
  bodyHtml: string,
): string {
  return `---\n${stringifyYaml(data).trimEnd()}\n---\n\n${bodyHtml.trim()}\n`;
}
