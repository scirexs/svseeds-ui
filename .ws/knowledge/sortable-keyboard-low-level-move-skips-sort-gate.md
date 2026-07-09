# Keyboard DnD calling `#moveTo` directly skips the `sort` gate

**Applies to:** `ZSortableA11y.svelte` and any future keyboard DnD extension of
`SortableController`, as of this repo's `Sortable` implementation (task
`20260708_qdxh75`).

## Finding

`SortableController.#moveTo()` is a low-level positional move helper; it does
**not** enforce sort permissions. The pointer drag path gates all moves through
`#canSort()` (which checks `member.sort`) before calling `#moveTo()`. A keyboard
handler that calls `#moveTo()` directly — e.g. after `#keyboardTarget()` returns
an adjacent same-list slot — bypasses this gate entirely. The result: ArrowUp /
ArrowDown in a grabbed keyboard drag can reorder items inside a list even when
`sort={false}` is set on that list.

## Why it matters / how to apply

Any keyboard (or programmatic) move path must reproduce the `#canSort()` / `member.sort`
check before calling `#moveTo()`. Do not assume that calling a controller helper implies
the guard has been applied — trace whether the pointer path calls a gate function first
and mirror it in the keyboard path.

Cross-list moves are governed by `accept`, not `sort`; the issue is specific to
same-list reordering when `sort` is false.

## References

First found in code review of task `20260708_qdxh75` (`review-result-1.md`,
blocking finding 1). The `sort={false}` regression test was added in the
`request-fix1.md` fix round. See also
`sortable-commit-followers-remove-before-insert.md` for a related `#moveTo` ordering
gotcha.
