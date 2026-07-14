# Browser-serialized `style` attribute inserts a space after each colon

**Applies to:** Chromium via `@vitest/browser-playwright` (`vitest-browser-svelte`
component tests reading `element.getAttribute("style")`); observed in this repo as
of the vitest 4 / `@vitest/browser-playwright` browser test setup.

## Finding

When a component sets an inline `style` attribute (e.g. Svelte's compiled
`style="...;overflow:visible"`), reading it back with `getAttribute("style")` in a
real browser does not return the authored string verbatim — the browser
re-serializes the attribute and inserts a space after each declaration's colon.
An authored `overflow:visible` reads back as `overflow: visible`.

## Why it matters / how to apply

When asserting on `getAttribute("style")` content in a test, match the
browser-normalized form (`"overflow: visible"`), not the literal source string
written in the component (`"overflow:visible"`) — otherwise `toContain`/equality
assertions fail even though the style is correctly applied.

## References

Surfaced while extending `tests/Popover.svelte.test.ts` for the `arrow` →
`overflow: visible` panel style (task 20260714_rctuws).
