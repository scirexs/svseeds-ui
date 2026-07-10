# 009. Sortable unified — keyboard DnD folded in, ZSortableA11y removed

**Status:** Accepted
**Supersedes:** 003-keyboard-dnd-in-verification-copy.md
**Date:** 2026-07-10
**Affects:** public package surface (removes exported `ZSortableA11y` component and
`createZSortableA11yGroup` factory; `Sortable` becomes keyboard-capable and its group
factory is `createSortableGroup`); Sortable keyboard accessibility

## Context
ADR 003 built the WAI-ARIA keyboard drag-and-drop path in a Z-prefixed verification copy,
`ZSortableA11y.svelte` (a faithful copy of `Sortable.svelte` plus a keyboard layer),
shipped provisionally so the maintainer could validate it as a real installed component
before deciding whether to fold the keyboard path back into `Sortable`. That validation
has now happened: the copy was exercised in an external project and behaved correctly.
Maintaining two near-duplicate components means every change must be applied twice, so the
verification copy has served its purpose and should become canonical.

## Decision
Promote the verification copy to be the canonical component: replace `Sortable.svelte`
(pointer-only) with the content of `ZSortableA11y.svelte` under the `Sortable` name. Because
the two components no longer coexist in the generated package index, the copy's one renamed
factory export reverts from `createZSortableA11yGroup` to `createSortableGroup` — the name
ADR 003 changed only to survive index de-dup. `SortableGroup` keeps its context-based
grouping unchanged. `ZSortableA11y` and `createZSortableA11yGroup` are removed from the
public surface; the single `Sortable` now carries both pointer and keyboard DnD.

## Consequences
- One component to maintain; keyboard DnD is the default for every `Sortable` consumer.
- Public API break (pre-1.0): consumers importing `ZSortableA11y` / `createZSortableA11yGroup`
  must switch to `Sortable` / `createSortableGroup`.
- The `Z` prefix convention (ADR 003) has no remaining user; it stays available for future
  provisional components.
- The two unit specs merge into one `Sortable.svelte.test.ts` covering both DnD paths.

## Rejected alternatives
- **Keep both components** — avoids the API break but doubles maintenance for every future
  Sortable change, the cost that motivated the merge.
- **Keep the `createZSortableA11yGroup` name on the unified component** — leaves a
  "ZSortableA11y" token in the public API of a component no longer named that, with no upside
  now that index de-dup no longer forces the rename.
