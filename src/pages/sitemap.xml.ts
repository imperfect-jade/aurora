import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { loadCategoryRegistry } from "../lib/content/schema";
import { sitePath } from "../lib/site/urls";

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL("https://imperfect-jade.github.io");
  const notes = await getCollection("notes");
  const categories = await loadCategoryRegistry("config/categories.yml");
  const routes = [
    "",
    "categories/",
    "courses/",
    "search/",
    ...categories.map((category) => `categories/${category.id}/`),
    ...notes.map((note) => note.data.type === "course-moc"
      ? `courses/${note.data.slug}/`
      : `notes/${note.data.slug}/`),
  ];
  const urls = [...new Set(routes)]
    .map((route) => `<url><loc>${escapeXml(new URL(sitePath(route), origin).href)}</loc></url>`)
    .join("");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
