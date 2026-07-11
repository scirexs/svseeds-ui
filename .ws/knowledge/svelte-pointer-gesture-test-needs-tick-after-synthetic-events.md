# Synthetic pointer-event tests need `await tick()` before asserting post-gesture visual state

**Applies to:** Svelte 5 browser-mode component tests (Vitest browser env) that
dispatch synthetic `pointerdown`/`pointermove`/`pointerup` sequences.

## Finding

Dispatching synthetic pointer events does not itself wait for Svelte's DOM
flush. A test that asserts computed style / class / position immediately after
the last dispatched event can read **pre-update** DOM state and still pass,
masking a real bug in the assertion rather than confirming the behavior.

## Why it matters / how to apply

After the final synthetic pointer event in a gesture sequence (e.g. `pointerup`
ending a drag or tap), `await tick()` before asserting any post-gesture visual
property (transform, class, computed style). This applies beyond
`WheelPicker` to any component test driving pointer/keyboard gestures
synthetically and then checking DOM-derived state.

## References

Flagged independently by both `impl` and `review` during `WheelPicker`
tap-to-select work (task `20260711_avyar4`).
