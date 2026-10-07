# Aurora site contract

Read this reference when diagnosing or changing public content structure, Markdown conversion, navigation, search, or security behavior.

## Source boundary

The configured Vault is read-only. Scan only:

- `40 Published/Courses`
- `40 Published/Reviews`
- `40 Published/Tools`

Resolve referenced files only within `90 Attachments`. Do not scan drafts to infer publication intent, and do not change source notes.

## Public content

Required fields are `title`, `type`, stable globally unique `slug`, registered `category`, `summary`, `status`, `created`, and `updated`. Use `course`, `parent`, `chapter`, and `tags` where applicable. Only `complete` and `evergreen` statuses are public.

The public hierarchy is `category → course/topic → chapter/note`. Reviews belong to their course or topic. URLs use stable slugs rather than Vault paths.

Never expose non-whitelisted frontmatter, including `source_user`, `source_web`, and `source-index`, or any local absolute path. Sensitive text scanning applies to frontmatter, body, generated files, diffs, and reports.

## Conversion and search

The repository pipeline owns wiki links, anchors, referenced assets, callouts, tables, footnotes, code, LaTeX, Mermaid, embeds, and restricted raw HTML. Missing or ambiguous links/assets block the operation. HTML must reject scripts, active embeds, inline handlers, unsafe URLs, and unapproved iframe hosts.

Pagefind indexes only title, category, course/topic name, summary, tags, and headings. Body-only words and private metadata must remain absent from the index.

Images are checked for resolvability, integrity, and optimization. The user owns privacy, EXIF, copyright, and visual-content review.
