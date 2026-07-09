# `bind:this={arr[i]}` collections keep stale entries after the source list shrinks

**Applies to:** Svelte 5 `bind:this` bound into an array/record indexed from an
`{#each}` over a shrinkable source list; observed in this repo across
CheckField, ToggleGroup, Tabs, WheelPicker, Calendar (task 20260709_bfinc7).

## Finding
`bind:this={arr[i]}` only **writes** entries for indices/keys that are
currently rendered — Svelte never rewrites or clears an entry whose `{#each}`
row was removed. When the source list shrinks (fewer options/tabs/cells),
`arr` keeps its old length with trailing stale (or `null`) entries beyond the
new item count, or, for a keyed record (e.g. `Record<string, HTMLElement>`),
stale keys for items no longer rendered. Consumers that iterate the full
collection (`elements.filter(...)`, `elements[0]`, a keyed lookup) can then
see a removed element, which is at best wrong and at worst a runtime error
(e.g. `elements.filter((el) => el.checked)` throwing if a stale entry is
`null`/detached).

## Why it matters / how to apply
Trim the collection to the live item count/key set in an `$effect.pre` keyed
on the **same source list** the `{#each}` iterates, after `untrack` (per
coding-style §5): for arrays, `if (arr.length > list.length) arr.length =
list.length;`; for a keyed record, delete keys not in the current visible-item
set. Do **not** clear the whole collection reactively — that would drop live
refs for still-mounted items, since `bind:this` will not re-populate an
already-mounted element's slot. Trimming only the tail/removed-keys preserves
already-bound live elements while dropping exactly the stale ones.

## References
Surfaced while fixing stale `bind:this` collections in CheckField, ToggleGroup,
Tabs, WheelPicker, Calendar (task 20260709_bfinc7); CheckField's
`elements.filter((el) => el.checked)` was the concrete risk of a `TypeError`
on shrink.
