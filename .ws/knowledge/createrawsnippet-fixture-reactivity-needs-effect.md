# `createRawSnippet` test fixtures need `$effect` for reactive args

**Applies to:** Svelte 5 `createRawSnippet` (svelte test fixtures), observed in this
repo as of the `vitest-browser-svelte` test setup used for `.svelte.test.ts` files.

## Finding

`createRawSnippet`'s `render()` runs once at mount; if a fixture's `setup(node)`
just reads a reactive snippet argument (e.g. `picking: () => boolean`) once, the
rendered DOM never reflects later changes to that argument. Wrapping the DOM
update in `$effect(() => { ... })` inside `setup` re-runs it whenever the
snippet's reactive argument accessors change, keeping the fixture's rendered
output synchronized.

## Why it matters / how to apply

When a test fixture snippet needs to assert on a value that changes after mount
(e.g. `picking` toggling between the calendar grid and month/year picker), read
the accessor inside a `$effect` in `setup` and write the result into the node's
text/attribute, rather than only reading it once during `render()`.

## References

`tests/Calendar.svelte.test.ts` — `labelSnippet` and `bottomSnippet` fixtures
both use this pattern to track `picking` reactively (task `20260714_uuo4qa`,
extending Calendar's `bottom` snippet with `CalendarCtl`).
