# `userEvent.click` is a no-op on `aria-disabled="true"` elements in vitest-browser-svelte

**Applies to:** vitest `^4.1.9`, vitest-browser-svelte `^2.1.1`,
`@vitest/browser-playwright` `^4.1.9` (Playwright provider).

## Finding
`userEvent.click` treats an element with `aria-disabled="true"` as not
clickable and silently does not deliver the click, so a handler guarded only by
`aria-disabled` (a focusable element that stays in the tab order but no-ops its
action) is never exercised through `userEvent.click`. Dispatching a DOM event
directly — `el.dispatchEvent(new MouseEvent("click", { bubbles: true }))` — does
reach the handler.

## Why it matters / how to apply
To assert that a focusable `aria-disabled` control no-ops (or to drive any
aria-disabled element in a test), bypass `userEvent` and dispatch the DOM event
yourself; otherwise the assertion passes vacuously because no click ever fired.
The Pagination tests wrap this in a local `fireEvent.click` helper that
dispatches `new MouseEvent("click", { bubbles: true })`.

## References
`tests/Pagination.svelte.test.ts` `fireEvent.click` helper and the
`aria-disabled` first/previous/next/last button cases.
