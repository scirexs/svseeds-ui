# `animate:flip` skips its FLIP positioning if the node already has a running animation

**Applies to:** Svelte `svelte/animate` `flip` combined with `in:`/`out:` transitions (e.g. `crossfade`) on the same node; observed in this repo as of svelte@5.x.

## Finding

Svelte's `animate:` runtime explicitly skips applying its temporary FLIP positioning transform when the element already has another animation/transition running, since both would otherwise write competing `transform` values on the same node. In `Sortable.svelte` this meant a cross-list drag — where the moved node is driven by `crossfade`'s `send`/`receive` — could have `animate:flip` fight the crossfade transform on that same node, producing an out-of-frame slide before the item snapped into place.

## Why it matters / how to apply

Don't let `animate:flip` and a crossfade (or other `in:`/`out:`) transition own the same moving node at once. In `Sortable.svelte`, `SortableController.flip(memberId, key)` resolves to a zero-duration transition param for the specific item mid cross-list move (tracked via `#crossing`), so FLIP no-ops on that node while crossfade drives it, and only same-list reorders get the real FLIP duration. Any future change to Sortable's transition directives must preserve this split (crossfade owns cross-list add/remove motion; FLIP owns same-list reposition).

## References

- `src/lib/_svseeds/Sortable.svelte` — `SortableController#flip`, `#skipFlip`, `#crossing`, `#noFlip`
- task 20260714_rzuyue
