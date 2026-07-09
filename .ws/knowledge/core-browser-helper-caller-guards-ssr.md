# `_core.ts` browser-dependent helpers assume `window` exists; callers keep the SSR guard

**Applies to:** Observed in this repo as of the `_core.ts` / `*.svelte` component
convention (e.g. `_detectOverflow`, commit ecb277b and later).

## Finding

Shared helpers in `_core.ts` that touch browser globals (e.g. `_detectOverflow`
reading `window.innerWidth`/`innerHeight`) are written with **no internal
`typeof window === "undefined"` guard** — they assume they are only ever called
client-side. The guard lives in each calling component, before the helper is
invoked (see `ComboBox.svelte`, `DateInput.svelte`, `DarkToggle.svelte`,
`Toast.svelte`, `WheelPicker.svelte`, `Calendar.svelte`, `Disclosure.svelte`).

## Why it matters / how to apply

When adding a new `_core.ts` helper that touches a browser-only API, do not add
an SSR guard inside the helper — keep it caller-side, matching every existing
site. Conversely, when calling such a helper (or writing a new component that
does), keep the `typeof window === "undefined"` (or element-existence) guard
**before** the call; the helper will not protect you and dropping the guard
breaks SSR.

## References

Surfaced while extracting `_detectOverflow` out of `ComboBox.svelte` /
`DateInput.svelte`'s duplicated `observeOverflow` logic into `_core.ts`
(task 20260709_czievh).
