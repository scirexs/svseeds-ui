# `userEvent.click` in browser mode also synthesizes pointer movement

**Applies to:** `@vitest/browser` (`userEvent` from `vitest-browser-svelte` or similar), observed in this repo as of the MenuSub feature work (commit `de5f824`).

## Finding
`userEvent.click` in browser mode does not dispatch a bare click — it also synthesizes pointer movement (hover) events as part of the same interaction sequence. For a hover-opened element (e.g. a submenu opened on `pointerenter`), a single simulated click can therefore both trigger the hover-open path and the click's own toggle-close path in the same sequence, closing what the click was meant to open/keep open.

## Why it matters / how to apply
When testing click behavior on an element that also has hover-driven open/close logic, the click handler must distinguish "this open happened via hover earlier" from "this open is part of the current click's own synthesized pointer movement" — otherwise `userEvent.click` in a test can produce different net state than a real mouse click that isn't preceded by a hover. Do not assume `userEvent.click` is pointer-event-neutral when writing hover+click interaction tests.

## References
Found while implementing/testing the MenuSub safe-triangle hover submenu (`feedback-implementer.md`).
