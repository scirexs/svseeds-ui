# `enterGroup` can fire after item-level `over()` and must not re-append

**Applies to:** `SortableController` in `src/lib/_svseeds/Sortable.svelte`; native
pointer event ordering (browser-observed, not Svelte-specific).

## Finding

The browser fires `pointerover` (on a specific `<li>`) **before** `pointerenter`
(on the containing `<ul>`) when the pointer crosses from outside onto an item.
So dragging onto an existing item in another group member runs `over()` first
(placing the item at that item's position via `#sort`), then `enterGroup()`
fires right after and unconditionally appended the dragged item to the end —
clobbering the position `over()` had just set. FLIP-induced spurious
`pointerover` on the list's blank area (see
`css-flip-animation-spurious-pointerover.md`) could then re-trigger
`enterGroup()` repeatedly, since unlike `over()` it was not lock-guarded,
producing a visible flip-flop before the list settled.

## Why it matters / how to apply

`enterGroup(member)` must no-op once the dragged item already resides in
`member` (`this.#active.current.id === member.id`) — append is only correct on
the transition **into** a list from outside; once inside, position is owned by
`over()` / `#sort`. Any future change to entry/append handling on `enterGroup`
must preserve this guard, and any similarly-paired "specific target" vs.
"container" event handlers in this codebase should assume the same
item-before-container firing order.

## References

- `src/lib/_svseeds/Sortable.svelte` — `SortableController.enterGroup`, `over`, `#sort`, `#append`
- task 20260713_x5mal6
