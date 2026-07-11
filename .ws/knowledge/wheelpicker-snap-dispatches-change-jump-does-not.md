# WheelPicker: `snap()` always dispatches `change`; `jump()` is the silent visual re-settle

**Applies to:** `src/lib/_svseeds/WheelPicker.svelte`, as of the tap-to-select feature (task `20260711_avyar4`).

## Finding

`snap()` unconditionally commits through the native `<select>` change path, so
`hchange` always fires `onchange?.(ev)` when `snap()` runs — even if the
resolved index equals the current selection. `jump(index)` performs the same
visual re-settle (moving `pos` back to the row's rest position, respecting
reduced-motion) without going through the native change dispatch.

## Why it matters / how to apply

Any gesture-handling code that must re-settle the drum visually **without**
firing `change` (e.g. a tap that resolves to the already-selected row after a
few px of incidental pointer travel) must call `jump(index)` directly, not fall
through to `snap()`. Falling through to `snap()` looks like the natural "no-op"
path but silently violates a "fires no `change`" invariant.

## References

Surfaced by review round 1 (`needs_fix`: selected-row tap under `TAP_SLOP`
travel left the drum visually displaced) and confirmed by `analyze`: the
request's own C-1 (“already-selected tap falls through to `snap()`”) briefly
contradicted the Done-when clause (“fires no `change`”) — resolved by using
`jump(index)` for that branch instead of either a bare return or `snap()`.
