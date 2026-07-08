# FLIP animation causes spurious `pointerover` on just-moved targets

**Applies to:** Svelte `animate:flip` (or any CSS transform-based FLIP) + native pointer events; observed in this repo as of svelte@5.x / vitest-browser-svelte.

## Finding

When a drag-and-drop sort reorders list items and a FLIP animation slides them to their new DOM positions, the browser hit-tests against the **animated (transformed)** bounding box, not the settled position. An item that just swapped past the pointer continues to overlap the pointer while it slides, and the browser fires another `pointerover` for that same target — even if the pointer is still moving. This causes a just-committed reorder to immediately reverse itself (ping-pong).

## Why it matters / how to apply

Any component that reorders on `pointerover` and uses CSS-transform animations (FLIP) must guard against these spurious re-fires. The reliable fix is a per-target timed lock keyed to the animation duration (`tp.duration`): once a sort commits onto a target, ignore further `over()` calls on that target for the flip window. The lock must self-release (not depend on `pointerout`) and must be cleared on drag end.

## References

- `src/lib/_svseeds/Sortable.svelte` — `SortableController`, `#lock` / `#isLocked` / `#clearLocks`
- Root cause verified by reproducing ping-pong on backward drags (task 20260708_wpr67y)
