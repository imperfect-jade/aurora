import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "must be an ISO date");

export const publicNoteSchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["course-moc", "note", "review", "tool"]),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must use lowercase kebab-case"),
  category: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(280),
  status: z.enum(["complete", "evergreen"]),
  created: isoDate,
  updated: isoDate,
  course: z.string().trim().min(1).optional(),
  parent: z.string().trim().min(1).optional(),
  chapter: z.union([z.number().int().nonnegative(), z.string().trim().min(1)]).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
});

const categorySchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "category id must use lowercase kebab-case"),
  label: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  order: z.number().int(),
  parent: z.string().trim().min(1).optional(),
});

const categoryFileSchema = z.object({
  categories: z.array(z.unknown()),
});

export type PublicNote = z.infer<typeof publicNoteSchema>;
export type Category = z.infer<typeof categorySchema>;

export function parseCategoryRegistry(input: unknown): Category[] {
  const categories = z.array(categorySchema).parse(input);
  const byId = new Map<string, Category>();

  for (const category of categories) {
    if (byId.has(category.id)) {
      throw new Error(`Duplicate category id: ${category.id}`);
    }
    byId.set(category.id, category);
  }

  for (const category of categories) {
    if (category.parent && !byId.has(category.parent)) {
      throw new Error(`Unknown parent category: ${category.parent}`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) {
      throw new Error(`Category parent cycle detected at: ${id}`);
    }
    if (visited.has(id)) return;

    visiting.add(id);
    const parent = byId.get(id)?.parent;
    if (parent) visit(parent);
    visiting.delete(id);
    visited.add(id);
  };

  for (const category of categories) visit(category.id);
  return categories;
}

export async function loadCategoryRegistry(filePath: string): Promise<Category[]> {
  const source = await readFile(resolve(filePath), "utf8");
  const document = categoryFileSchema.parse(parseYaml(source));
  return parseCategoryRegistry(document.categories);
}

export function parsePublicNote(
  input: unknown,
  categoryIds: readonly string[],
): PublicNote {
  const note = publicNoteSchema.parse(input);
  if (!categoryIds.includes(note.category)) {
    throw new Error(`Unknown category: ${note.category}`);
  }
  return note;
}

export function parsePublicNotes(
  inputs: readonly unknown[],
  categoryIds: readonly string[],
): PublicNote[] {
  const notes = inputs.map((input) => parsePublicNote(input, categoryIds));
  const slugs = new Set<string>();

  for (const note of notes) {
    if (slugs.has(note.slug)) {
      throw new Error(`Duplicate slug: ${note.slug}`);
    }
    slugs.add(note.slug);
  }

  return notes;
}
