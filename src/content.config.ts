import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { publicNoteSchema } from "./lib/content/schema";

const notes = defineCollection({
  loader: glob({ base: "./src/generated/notes", pattern: "**/*.{md,mdx}" }),
  schema: publicNoteSchema,
});

export const collections = { notes };
