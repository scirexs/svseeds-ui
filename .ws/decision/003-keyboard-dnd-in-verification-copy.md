# 003. Keyboard drag-and-drop developed in a Z-prefixed verification copy

**Status:** Superseded by 009-sortable-unified-keyboard-dnd.md
**Supersedes:** none
**Date:** 2026-07-08
**Affects:** public package surface (new exported component `ZSortableA11y` +
`createZSortableA11yGroup`); `SortableGroup` / `Sortable` accessible name; Sortable keyboard
accessibility

## Context

`Sortable` / `SortableGroup` implement drag-and-drop with pointer events only; there is no
WAI-ARIA APG keyboard path (pick up / move / drop). Keyboard DnD is a wanted improvement but
high-risk: the `SortableController` is pointer-centric and its recent history is a run of
subtle reorder bug fixes (FLIP-induced `pointerover`, multi-select followers). Adding a
parallel keyboard state machine directly to the production component risks regressing shipped
pointer behavior during pre-release.

## Decision

Develop the keyboard DnD path in a **copy**, `ZSortableA11y.svelte` (a faithful copy of
`Sortable.svelte` plus the keyboard layer), instead of modifying `Sortable.svelte`. The copy
ships in the package under a `Z` prefix — it is not surfaced in the docs site or CLI
suggestions — so the maintainer can validate it as a real installed component before deciding
whether to fold the keyboard path back into `Sortable`. The low-risk accessible-name fixes are
applied directly to production: `SortableGroup` and `Sortable` both gain an
`aria-label` / `aria-labelledby` `{...rest}` passthrough (the latter with an explicit
`ariaLabel` recommendation prop, matching `Modal` / `Toggle` / `Drawer`). Because the package
index de-dupes exports by name, the copy renames its one factory export to
`createZSortableA11yGroup`; its duplicate type exports de-dupe harmlessly against the identical
originals.

## Consequences

- Production `Sortable` pointer behavior carries zero regression risk from the keyboard work.
- The package temporarily exposes a near-duplicate component; the `Z` prefix marks it as
  provisional and keeps it out of docs/CLI suggestions.
- A future task may merge the validated keyboard path into `Sortable` and remove
  `ZSortableA11y`; that will be its own decision.
- The `Z` prefix is established as the convention for provisional/verification components.

## Rejected alternatives

- **Modify `Sortable.svelte` directly** — least duplication, but risks regressing shipped
  pointer DnD during pre-release with no isolation to validate against.
- **Exclude the copy from the package (`prep.ts` filter for `Z*`)** — would prevent using it
  as a real installed component, which is the whole point of the verification step.
- **Rename all of the copy's exports to a `ZSortableA11y*` namespace** — larger, noisier diff
  against the source of truth; only the factory actually needs renaming to survive index
  de-dup.
