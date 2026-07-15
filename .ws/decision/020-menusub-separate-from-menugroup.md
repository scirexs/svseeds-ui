# 020. MenuSub as a separate component rather than a mode on MenuGroup

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-15
**Affects:** public component surface (adds `MenuSub`), `MenuGroup`, `MenuList`, `MenuItemContext`, `MenuContainerContext`

## Context

`MenuGroup` shipped as a labelled cluster of items — `role="group"` with an
`aria-labelledby` label. Users reaching for a parent → child (submenu) menu, by far the more
common menu pattern, found no component for it and reasonably expected `MenuGroup` to be it.
The library needed the submenu pattern, and had to decide where it lives.

The two ARIA structures involved are genuinely different: a labelled cluster is
`div[role=group][aria-labelledby] > div.label + items`, while a submenu is
`div[role=none] > button[role=menuitem][aria-haspopup][aria-expanded] + div[role=none] > div[role=menu]`,
plus hover intent, a safe triangle, positioning, and a nested container context. Only the
label rendering is shared.

Both patterns are real and neither substitutes for the other: a menu heading is not a
submenu, and `role="group"` inside `role="menu"` has no other expression in the library.

## Decision

Keep `MenuGroup` unchanged as the `role="group"` labelled cluster, and add a separate
`MenuSub` component for the submenu pattern. `MenuSub` renders the trigger and provides
`MenuContainerContext` to a nested, caller-written `MenuList`, mirroring how `ContextMenu`
and `Popover` already host a `MenuList`.

## Consequences

- The public surface gains one component (`MenuSub`); the menu primitives become
  MenuList / MenuGroup / MenuItem / MenuSeparator / MenuSub.
- No breaking change: existing `MenuGroup` markup keeps its meaning and behavior.
- Naming now carries the distinction, which is what caused the original confusion — `MenuGroup`
  groups, `MenuSub` nests. Each file keeps one ARIA identity and one responsibility.
- The submenu pattern costs one extra level of nesting for the caller
  (`MenuSub > MenuList > MenuItem`), which is deeper than the library's usual
  single-level parent–child nesting. This is accepted: the nested `MenuList` is a real
  `role="menu"`, and reusing it keeps navigation, typeahead, and data mode from being
  reimplemented.
- Because a submenu is a `MenuList` inside a `MenuList`, level-scoped lookups become
  mandatory: `MenuList` must filter its items to its own `role="menu"`, and per-level
  submenu state (`_MenuLevel`) must hang off `MenuItemContext`.

## Rejected alternatives

- **A `submenu` mode prop on `MenuGroup`, defaulting to submenu** (the original request).
  Rejected: flipping the default silently reinterprets every existing `MenuGroup` as a
  submenu whose children are not a `MenuList` — a breaking change with no diagnostic — and it
  puts two different ARIA structures behind one prop, with each mode's props inert in the
  other.
- **Replacing `MenuGroup`'s meaning with the submenu pattern.** Rejected: it is breaking and
  it deletes the labelled-cluster capability outright, leaving no way to express
  `role="group"` inside a menu.
- **A `menu` snippet or an `items` array prop on the trigger instead of a nested `MenuList`.**
  Rejected: it would duplicate `MenuList`'s navigation, typeahead, and data mode, and would
  hide the submenu's prop surface from the caller.
