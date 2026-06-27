# `bun run build` writes `src/lib/index.ts` and `_svseeds/dep.json` as untracked, NON-gitignored files

**Applies to:** This repo's `build` pipeline (prep.ts -> @sveltejs/package ->
post.ts) as of commit 35f895e. `.gitignore` ignores `/dist/` but not the
generated source-tree files.

## Finding
`bun run build` regenerates two files **inside the source tree**:
`src/lib/index.ts` (the aggregated export index) and
`src/lib/_svseeds/dep.json` (the CLI dependency map). Neither is git-tracked, and
**neither is listed in `.gitignore`** -- only the separate `dist/` output dir is
ignored (`/dist/`). So after a build these two files linger as untracked,
un-ignored entries in `git status`, unlike the gitignored `.svelte-kit/` and
`dist/`.

## Why it matters / how to apply
When validating a build during a cowork task, expect three generated artifacts:
gitignored `dist/`, plus untracked-but-not-ignored `src/lib/index.ts` and
`src/lib/_svseeds/dep.json`. The latter two will show in `git status` and must be
dealt with explicitly (they were moved to `/tmp/trash/` after validation here).
Do not confuse them with the gitignored build dirs that should simply be left in
place (see `bun-run-check-generates-svelte-kit-dir.md`).

## References
Surfaced reworking the build/publish pipeline; the reviewer also flagged whether
these should be added to `.gitignore` (tracked as a maintainer follow-up).
