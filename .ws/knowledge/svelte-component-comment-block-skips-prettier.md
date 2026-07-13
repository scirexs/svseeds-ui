# `@component` Types block is not Prettier-formatted or checked

**Applies to:** This repo's `@component` doc-comment convention
(`.ws/policy/coding-style.md` §11/§14), Prettier as configured here.

## Finding
The `@component` Types block lives inside the leading `<!-- @component … -->` HTML
comment. Prettier does not format or lint content inside HTML comments, so
`bun run fmt:check` stays silent when a Types-block trailing `// …` annotation has
drifted out of sync with the exported `Props` interface (which Prettier *does*
check, enforcing `; // ` spacing there).

## Why it matters / how to apply
When a task touches per-prop trailing annotations (adding, renaming, syncing
Types-block ↔ `Props` interface), verify the `@component` Types block by hand
against the interface. A passing `fmt:check` is not a sync signal for that block —
it only validates the interface side.

## References
Surfaced while syncing `Props` interface annotations with the `@component` Types
block across 16 components (task 20260713_hqhi33).
