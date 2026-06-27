# No native `npm` on PATH: use `bunx --bun npm pack --dry-run` to inspect the npm file set

**Applies to:** This repo's dev/CI environment (Bun 1.3.14, no `npm` binary on
PATH). Observed as of commit 35f895e.

## Finding
There is no native `npm` executable on PATH here -- only Bun. So a literal
`cd dist && npm publish --dry-run --provenance=false` cannot be run as written.
`bunx --bun npm pack --dry-run` reproduces the published file list and is enough
to verify what npm would ship (e.g. that `_core.ts` and `dep.json` are excluded).
`bunx --bun npm publish --dry-run --provenance=false` prints the tarball contents
too, but then still **fails on registry/version state** (e.g. the current version
already published) even though packaging itself succeeded.

## Why it matters / how to apply
When a task asks you to validate the npm publish via `npm publish --dry-run`,
substitute `bunx --bun npm pack --dry-run` to confirm the file set without a
registry round-trip. Treat a non-zero exit from `bunx --bun npm publish
--dry-run` as inconclusive, not a failure, if the failure is a registry/version
error after the file list has already printed.

## References
Surfaced validating the reworked build/publish pipeline from `dist/`.
