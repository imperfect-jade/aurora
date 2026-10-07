# Release authorization

Read this reference before commit decisions, push, GitHub Pages deployment, or any claim that a release may proceed automatically.

## Decision levels

| Level | Meaning | Action |
|---|---|---|
| `blocked` | Any hard blocker or required validation failure | Do not commit a deployable change, push, or deploy |
| `manual` | Default; any warning or forever-manual change | Present the redacted report and request this release's confirmation |
| `auto` | Only low-risk add/update in an exactly authorized task category | Continue only through the explicitly authorized boundary |

Auto-authorizable change kinds are `content-add` and `content-update`. Exact category matching is mandatory: authorization for `course-note-update` does not authorize `tool-note-update`.

Forever-manual changes are deletion, withdrawal, slug/URL change, category move, large diff, rollback, dependency change, workflow change, visual change, and other site-code changes. Any warning also forces `manual`.

## Report contract

Build the JSON input for `npm run release:prepare -- --input <file>` from observed changes and current validation results. Supply automatic authorization only when the user explicitly granted that exact category. Do not persist user authorization in Git or in this skill.

The resulting report must cover:

- added, updated, and deleted public slugs;
- URL changes and referenced attachments;
- blocker, warning, and informational findings;
- typecheck, test, build, browser, and preview results;
- decision, reasons, and whether push/deployment ran.

The script never performs push or deployment. After a `manual` result, stop. After an `auto` result, perform only the external mutation named in the user's authorization. Deploy Pages through the repository's manual workflow; do not introduce a push-triggered deployment path.
