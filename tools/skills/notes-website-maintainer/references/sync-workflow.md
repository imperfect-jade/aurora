# Sync, validation, and preview

Read this reference for routine content maintenance.

## Stable interfaces

Require these `package.json` commands to exist before continuing:

| Command | Purpose |
|---|---|
| `npm run sync:check` | Read-only Vault preflight using a temporary output root |
| `npm run sync` | Atomically refresh generated public notes and referenced media |
| `npm run security:scan` | Scan tracked and unignored repository text with redacted findings |
| `npm run validate` | Typecheck, unit tests, production build, and Pagefind index |
| `npm run test:e2e` | Reader navigation, theme, motion, accessibility, and dialog behavior |
| `npm run dev` | Local development preview |
| `npm run preview` | Preview the most recent production build |
| `npm run release:prepare -- --input <file>` | Create a redacted authorization report without push/deploy |

If an interface is absent or incompatible, stop and report it. Do not emulate it with ad-hoc file copying.

## Routine sequence

1. Verify remote and worktree state.
2. Confirm the gitignored local Vault configuration exists; never print or commit its absolute path.
3. Run `npm run sync:check`. On failure, report redacted blockers and stop.
4. Run `npm run sync` only when the task includes updating generated website content.
5. Review the complete diff. Separate content changes from design, code, dependency, and workflow changes.
6. Run `npm run validate` (including the repository sensitive-text scan) and the browser tests appropriate to the change.
7. Preview reader-facing routes when content or UI changed.
8. Prepare the release report and apply [release-authorization.md](release-authorization.md).

The sync result may list written, unchanged, and removed slugs. A removal is forever-manual even when an ordinary update category was previously authorized.
