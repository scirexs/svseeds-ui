# Nested `role="menu"` trees: ancestor keydown handlers must ignore bubbled descendant events

**Applies to:** Any component tree with nested `role="menu"` levels (e.g. submenu patterns), observed in this repo's `MenuList`/`MenuSub` (as of the MenuSub feature, commit `de5f824`).

## Finding
Level-scoped DOM queries alone are not enough to isolate keyboard handling per menu level. A nested (child) `role="menu"` handles its own `ArrowDown`/`ArrowUp`/`Home`/`End`/typeahead first, but the `keydown` event still bubbles to the ancestor `role="menu"`'s handler. If the ancestor handler does not check that the event originated within its own level, it re-runs the same key against its own item list — e.g. moving focus back to an outer item right after the inner list already handled it.

## Why it matters / how to apply
Any ancestor-level keydown handler in a nested-menu component must guard against descendant-originated events, e.g.:
```ts
if ((ev.target as HTMLElement | null)?.closest('[role="menu"]') !== element) return;
```
Without this guard, outer-level traversal reacts to submenu key presses, breaking the contract that each nested menu level owns its own navigation/typeahead behavior.

## References
Found via review findings on the MenuSub/MenuList submenu feature (`MenuList.svelte:173`, `hkeydown`).
