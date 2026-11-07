# After `vi.resetModules()`, a static Svelte test renderer mismatches freshly imported components

**Applies to:** Observed in this repo as of vitest + `@testing-library/svelte` + Svelte 5 (jsdom simulation tests).

## Finding
After `vi.resetModules()`, a dynamically imported Svelte component loads a fresh Svelte runtime, while a statically imported renderer still uses the old one. Mounting fails with `Cannot read properties of null (reading 'f')`.

## Why it matters / how to apply
For fresh-singleton mount tests, dynamically import `@testing-library/svelte/pure` together with the component after the reset, and call its `cleanup()` after each test. No test config change is needed.
