# `#commitFollowers` must splice followers out before calling `insertAfter`

**Applies to:** `src/lib/_svseeds/Sortable.svelte` — `SortableController` as of this repo.

## Finding

When `#commitFollowers` relocates followers next to the leader, the splice removals must happen **before** calling `insertAfter`. `insertAfter` re-finds the leader's current position by key (`findIndex(active.current, active.activeKey)`) rather than using a pre-captured index — so after any preceding splices it re-derives the correct position from the live array. This is especially important for same-list commits where followers may sit before the leader and would otherwise shift its index down.

## Why it matters / how to apply

If you capture the leader's index before splicing and pass it directly to the insert, you get an off-by-one whenever a follower precedes the leader in the list. The safe pattern: always splice followers out first (highest index first to avoid cascade shifts), then call `insertAfter` — which will resolve the leader's position from the current array state.

## References

- `src/lib/_svseeds/Sortable.svelte` — `SortableController.#commitFollowers`, `insertAfter`
