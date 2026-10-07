import type { PublicNote } from "../content/schema";

export interface SearchDocumentInput {
  note: PublicNote;
  categoryLabel: string;
  courseTitle?: string;
  headings: readonly { text: string }[];
  bodyHtml?: string;
  sourceMetadata?: Record<string, unknown>;
  basePath?: string;
}

export interface SearchDocument {
  url: string;
  title: string;
  category: string;
  course?: string;
  summary: string;
  tags: string[];
  headings: string[];
  searchText: string;
}

export function createSearchDocument({
  note,
  categoryLabel,
  courseTitle,
  headings,
  basePath = "/aurora",
}: SearchDocumentInput): SearchDocument {
  const headingTexts = headings.map((heading) => heading.text);
  const tags = note.tags ?? [];
  const values = [
    note.title,
    categoryLabel,
    courseTitle,
    note.summary,
    ...tags,
    ...headingTexts,
  ].filter((value): value is string => Boolean(value));

  return {
    url: `${basePath.replace(/\/$/, "")}/notes/${note.slug}/`,
    title: note.title,
    category: categoryLabel,
    ...(courseTitle ? { course: courseTitle } : {}),
    summary: note.summary,
    tags,
    headings: headingTexts,
    searchText: values.join(" "),
  };
}
