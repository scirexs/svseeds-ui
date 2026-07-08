---
name: svelte-state-prop-initializer-warning
description: Svelte warns when $state directly captures a prop variable in its initializer; wrap the initial read in a helper to suppress it.
metadata:
  type: reference
---

# Svelte `$state` warns when directly capturing a prop in its initializer

**Applies to:** Svelte 5 (`$state` / `$props` runes); observed in this repo as of the Svelte 5 dependency in use at commit 5c71686.

## Finding

When `$state` is initialized directly from a destructured prop variable — e.g.
`let placement = $state<PopoverPosition>(position)` where `position` comes from
`$props()` — Svelte emits a compile/runtime warning. The warning fires because
Svelte treats the direct reference as a potential intent to keep state in sync
with the prop, which `$state` does not do (it only captures the initial value).

Wrapping the initial read in a tiny helper (a no-op indirection that returns the
value) breaks the direct prop-reference pattern and suppresses the warning, while
preserving the intended "initialize from prop, then evolve independently"
behavior.

## Why it matters / how to apply

Any component that seeds internal state from a prop at construction time will hit
this warning. The fix is a one-liner wrapper, not a structural change. Do not use
`$derived` (which re-follows the prop on every change) if the intent is a
one-time seed.

## References

Surfaced during Popover arrow caret-split implementation (task 20260708_dxvznm).
