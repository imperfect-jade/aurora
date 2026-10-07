import GithubSlugger from "github-slugger";
import { toText } from "hast-util-to-text";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { Root as HastRoot, Element } from "hast";
import { unified } from "unified";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { remarkObsidianCallouts } from "./plugins/callouts.ts";
import { remarkRawHtmlPolicy } from "./plugins/raw-html-policy.ts";

export interface MarkdownNoteSource {
  title: string;
  slug: string;
  markdown: string;
}

export interface MarkdownContext {
  currentSlug: string;
  notes: readonly MarkdownNoteSource[];
  basePath?: string;
  allowedIframeHosts?: readonly string[];
}

export interface HeadingEntry {
  depth: number;
  id: string;
  text: string;
}

export interface MarkdownResult {
  html: string;
  headings: HeadingEntry[];
  linkedSlugs: string[];
}

interface TransformState {
  byReference: Map<string, MarkdownNoteSource>;
  linkedSlugs: Set<string>;
  basePath: string;
}

function createState(context: MarkdownContext): TransformState {
  const byReference = new Map<string, MarkdownNoteSource>();
  for (const note of context.notes) {
    byReference.set(note.title, note);
    byReference.set(note.slug, note);
  }
  return {
    byReference,
    linkedSlugs: new Set<string>(),
    basePath: context.basePath ?? "/aurora",
  };
}

function splitReference(reference: string): { noteName: string; section?: string } {
  const hashIndex = reference.indexOf("#");
  if (hashIndex === -1) return { noteName: reference.trim() };
  return {
    noteName: reference.slice(0, hashIndex).trim(),
    section: reference.slice(hashIndex + 1).trim(),
  };
}

function findNote(reference: string, state: TransformState): MarkdownNoteSource {
  const note = state.byReference.get(reference);
  if (!note) throw new Error(`Unpublished note reference blocked: ${reference}`);
  return note;
}

function extractSection(markdown: string, section: string): string {
  const lines = markdown.split(/\r?\n/);
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const headingPattern = new RegExp(`^(#{1,6})\\s+${escaped}\\s*$`);
  const start = lines.findIndex((line) => headingPattern.test(line.trim()));
  if (start === -1) throw new Error(`Embedded section not found: ${section}`);

  const level = lines[start].trim().match(/^(#{1,6})/)?.[1].length ?? 6;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const nextHeading = lines[index].match(/^(#{1,6})\s+/);
    if (nextHeading && nextHeading[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

async function replaceAsync(
  source: string,
  pattern: RegExp,
  replacer: (match: RegExpMatchArray) => Promise<string>,
): Promise<string> {
  let output = "";
  let lastIndex = 0;
  for (const match of source.matchAll(pattern)) {
    output += source.slice(lastIndex, match.index);
    output += await replacer(match);
    lastIndex = match.index + match[0].length;
  }
  return output + source.slice(lastIndex);
}

async function expandEmbeds(
  markdown: string,
  state: TransformState,
  stack: readonly string[],
): Promise<string> {
  return replaceAsync(markdown, /!\[\[([^\]]+)\]\]/g, async (match) => {
    const { noteName, section } = splitReference(match[1].split("|")[0]);
    const note = findNote(noteName, state);
    if (stack.includes(note.slug)) {
      throw new Error(`Recursive embed blocked: ${[...stack, note.slug].join(" -> ")}`);
    }

    state.linkedSlugs.add(note.slug);
    const selected = section ? extractSection(note.markdown, section) : note.markdown;
    return expandEmbeds(selected, state, [...stack, note.slug]);
  });
}

function slugHeading(value: string): string {
  return new GithubSlugger().slug(value.trim());
}

function resolveWikiLinks(markdown: string, state: TransformState): string {
  return markdown.replace(/\[\[([^\]]+)\]\]/g, (_match, rawReference: string) => {
    const [targetReference, alias] = rawReference.split("|");
    const { noteName, section } = splitReference(targetReference);
    const label = alias?.trim() || section || noteName;

    if (!noteName) {
      if (!section) throw new Error("Empty wiki link blocked");
      return `[${label}](#${slugHeading(section)})`;
    }

    const note = findNote(noteName, state);
    state.linkedSlugs.add(note.slug);
    const anchor = section ? `#${slugHeading(section)}` : "";
    return `[${label}](${state.basePath}/notes/${note.slug}/${anchor})`;
  });
}

function collectHeadings(headings: HeadingEntry[]): Plugin<[], HastRoot> {
  return () => (tree) => {
    visit(tree, "element", (node: Element) => {
      const match = node.tagName.match(/^h([1-6])$/);
      if (!match) return;
      const id = typeof node.properties?.id === "string" ? node.properties.id : "";
      headings.push({
        depth: Number(match[1]),
        id,
        text: toText(node),
      });
    });
  };
}

export async function transformMarkdown(
  markdown: string,
  context: MarkdownContext,
): Promise<MarkdownResult> {
  const state = createState(context);
  const withEmbeds = await expandEmbeds(markdown, state, [context.currentSlug]);
  const resolvedMarkdown = resolveWikiLinks(withEmbeds, state);
  const headings: HeadingEntry[] = [];

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkObsidianCallouts)
    .use(remarkRawHtmlPolicy(context.allowedIframeHosts ?? []))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex, { strict: "error", trust: false })
    .use(rehypeSlug)
    .use(collectHeadings(headings))
    .use(rehypeStringify)
    .process(resolvedMarkdown);

  return {
    html: String(file),
    headings,
    linkedSlugs: [...state.linkedSlugs].sort(),
  };
}
