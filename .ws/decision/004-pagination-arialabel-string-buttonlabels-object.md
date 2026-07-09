# 004. Pagination keeps the nav landmark name as `ariaLabel: string` and groups button labels into `buttonLabels`

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-09
**Affects:** `Pagination` public prop surface (`PaginationProps`)

## Context

`Pagination` renders a `<nav>` landmark root containing four icon control buttons
(first / prev / next / last) plus an embedded `ComboBox`. Accessible naming needs a
name on the nav landmark and on each icon button, so the component previously
exposed five flat props: `ariaLabel` plus `ariaTopLabel` / `ariaLeftLabel` /
`ariaRightLabel` / `ariaBottomLabel`. Migrating `Pagination` to extend the root
element's HTML attributes (matching Modal/Drawer/Toggle/Tabs) and to reduce the
prop-list noise forced a choice about how to shape these labels. The library-wide
convention is `ariaLabel?: string` = the component's own accessible name; folding
all five labels into one grouped object was a live alternative.

## Decision

The nav landmark name stays `ariaLabel?: string` (default `"Pagination"`),
identical in type and meaning to every other component's `ariaLabel`. The four
button labels — internal control names, not the component's landmark name — are
grouped into `buttonLabels?: PaginationLabel`, where
`PaginationLabel = { top?; left?; right?; bottom? }` keyed by `PARTS`. The four
`aria*Label` props are removed. `PaginationProps` extends
`Omit<HTMLAttributes<HTMLElement>, "children" | "aria-label">`; `class` and
`...rest` land on the `<nav>` `PARTS.WHOLE` root — the strict coding-style §14
default, since the nav root *is* the landmark (no Tabs-style split).

## Consequences

- `ariaLabel` keeps one type and one meaning across the whole library; the button
  labels no longer clutter the top-level prop interface.
- Two label surfaces coexist by design — a landmark `string` and a control-label
  object. Reviewers should not "unify" them into one object: the string carries the
  landmark semantics shared with every other component.
- Breaking change for callers using the old `aria*Label` prop names; they migrate
  to `buttonLabels={{ … }}`.
- Merging the two surfaces into one object later would be a breaking API change.

## Rejected alternatives

- **Single `ariaLabel?: PaginationLabel` for all five labels.** Internally tidy
  (keys match `PARTS`), but overloads `ariaLabel` to a non-string type, breaking the
  library-wide `ariaLabel: string` convention and detaching the landmark name from
  its cross-component meaning.
- **Keep the five flat `aria*Label` props.** Rejected: prop-list noise, and
  inconsistent with the extends pattern adopted across the other components.
