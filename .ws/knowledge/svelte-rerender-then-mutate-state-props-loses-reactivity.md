# Mixing `rerender(props)` with later `$state` props mutation breaks reactivity

**Applies to:** `vitest-browser-svelte` ^2.2.1, `svelte` ^5.56.4, `vitest` ^4.1.10.

## Finding

When a browser test renders a component with a reactive `$state({...})` props
object, calling `await rerender(props)` once and then later mutating that same
`props` object directly (without another `rerender`) can break Svelte's
reactive tracking for subsequent updates, surfacing as a `track_reactivity_loss`
warning and the component silently failing to pick up the next prop change.

## Why it matters / how to apply

Pick one props-driving mechanism per test and stick to it:
- Drive all updates purely through mutating the reactive `$state` props object
  plus `await tick()`, and never call `rerender` at all, or
- Drive all updates purely through `rerender(newProps)` and never mutate the
  original `$state` object afterward.

Mixing the two — one `rerender(props)` call followed by direct `props.x = y`
mutations — is the failure mode to avoid.

## References

Root-caused while stabilizing `tests/NumberInput.svelte.test.ts`'s "syncs
external value only while not focused" test (task 20260709_z4tgp7); fixed by
dropping the `rerender` call and driving the external value change via
`props.value = 2` + `await tick()` only.
