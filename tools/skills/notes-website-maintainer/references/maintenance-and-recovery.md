# Maintenance and recovery

Read this reference for dependency work, failing builds, GitHub Pages incidents, rollback, or recovery from a bad release.

## Dependency and site maintenance

Treat dependency, lockfile, visual, source-code, configuration, and workflow changes as forever-manual. Keep them separate from routine content commits. Review advisories and upstream release notes; do not apply `--force`, breaking downgrades, or broad upgrades without explicit approval.

Re-run clean installation, typecheck, unit tests, production build, browser tests, and a production preview after approved maintenance. Preserve reduced-motion and WebGL fallbacks and the `/aurora/` base path.

## Failure handling

On failure, preserve the last known deployable output and collect evidence from the first failing boundary: preflight, transform, generated content, build, Pagefind, browser tests, or Pages workflow. Do not edit the Vault to make a website test pass.

If GitHub Pages fails, inspect the workflow artifact and logs before retrying. A retry uses the same authorization only when it does not change code, content, commit, or release scope; otherwise request new confirmation.

## Rollback

Rollback is always manual. An old green commit is not automatically safe because the current public set or security policy may have changed.

Before rollback deployment:

1. Reconcile the candidate with the current published-note set so withdrawn content cannot reappear.
2. Re-run current security gates and the complete validation suite.
3. Generate a new redacted release report describing restored URLs/content.
4. Obtain confirmation for that exact rollback.

Do not use destructive Git commands. Prefer a new revert or restoration commit that keeps history auditable.
