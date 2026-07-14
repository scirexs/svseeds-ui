# `crossfade`'s `fallback` doesn't inherit the config's duration/easing

**Applies to:** Svelte `svelte/transition` `crossfade(params)`; observed in this repo as of svelte@5.x.

## Finding

`crossfade({ ...defaults, fallback })` does not automatically pass `defaults` (e.g. `duration`, `easing`) into the `fallback` transition when it runs for an unpaired `send`/`receive`. The fallback receives only what its own callback explicitly supplies.

## Why it matters / how to apply

If the fallback should match the crossfade pair's motion (e.g. honoring reduced-motion via `duration: 0`), pass the same transition params (`tp`) explicitly inside the fallback callback: `fallback: (node) => fade(node, tp)`. Omitting this makes the fallback use `fade`'s hardcoded defaults instead of the group's configured/resolved motion params.

## References

- `src/lib/_svseeds/Sortable.svelte` — `crossfade({ ...tp, fallback: (node) => fade(node, tp) })` in `createSortableGroup`
- task 20260714_rzuyue
