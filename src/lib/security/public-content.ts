import { isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";
import { parsePublicNote } from "../content/schema.ts";
import { assertSafeHtml } from "./html-policy.ts";
import { assertNoSensitiveText } from "./sensitive-scan.ts";

const headingSchema = z.object({
  depth: z.number().int().min(2).max(6),
  id: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

export function assertPathWithinRoot(root: string, candidate: string): string {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(candidate);
  const pathFromRoot = relative(resolvedRoot, resolvedCandidate);

  if (pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot)) {
    throw new Error("Path escape blocked");
  }

  return resolvedCandidate;
}

export function createPublicContent(
  input: unknown,
  categoryIds: readonly string[],
  bodyHtml: string,
  headingsInput: unknown,
) {
  assertNoSensitiveText(JSON.stringify(input), "frontmatter");
  assertNoSensitiveText(bodyHtml, "body");

  const note = parsePublicNote(input, categoryIds);
  const headings = z.array(headingSchema).parse(headingsInput);
  const safeBodyHtml = assertSafeHtml(bodyHtml, []);

  return {
    ...note,
    bodyHtml: safeBodyHtml,
    headings,
  };
}
