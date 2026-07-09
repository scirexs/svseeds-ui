# Keyboard follower move requires the grabbed item itself to be selected

**Applies to:** `src/lib/_svseeds/ZSortableA11y.svelte` — the keyboard grab path
(`hkeydown` building `followers` for `controller.grabKeyboard`), as of this repo.

## Finding

The pointer path builds `followers` from every currently-selected item
regardless of whether the item being grabbed is itself selected:
`const followers = multiple ? [...selected].filter((x) => x !== key) : [];`.
The keyboard grab path is stricter — it only includes followers when the
grabbed item is *also* selected:
`const followers = multiple && selected.has(key) ? [...selected].filter((x) => x !== key) : [];`.
Ctrl+Space-selecting a follower and then keyboard-grabbing (Space) a different,
unselected item moves that item alone; the selected follower is left behind.

## Why it matters / how to apply

When writing keyboard multi-select ("followers") tests, or otherwise driving
follower movement via keyboard, select the item you are about to grab (in
addition to any followers) before pressing Space — mirroring a pointer-path
follower test setup one-for-one will silently drop the followers on the
keyboard path.

## References

- `src/lib/_svseeds/ZSortableA11y.svelte` — pointer `followers` build in
  `hpointerdown` (~L905) vs. keyboard `followers` build in `hkeydown` (~L1009).
