# Svelte a11y checker treats a focusable `role="separator"` as non-interactive

**Applies to:** svelte ^5.56.4, svelte-check ^4.7.1, as observed in this repo
(Splitter.svelte WAI-ARIA Window Splitter pattern).

## Finding
Svelte's compile-time a11y checker does not recognize `role="separator"` as an
interactive role, even for the W3C WAI-ARIA **Window Splitter** APG pattern,
where the separator is intentionally focusable (`tabindex="0"`) and
keyboard-draggable. Adding `tabindex` and event handlers to it therefore trips
`a11y_no_noninteractive_tabindex` and `a11y_no_noninteractive_element_interactions`.

## Why it matters / how to apply
A focusable, keyboard-operable splitter handle is a legitimate APG pattern, but
`bun run check` will flag it. Suppress with a **narrow, role-listing**
`svelte-ignore` carrying the APG rationale, e.g.:

```svelte
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (WAI-ARIA Window Splitter uses a focusable, keyboard-draggable separator.) -->
```

Keep the suppression scoped to the separator element and name both warnings
explicitly rather than disabling a broader rule, so unrelated a11y issues still
surface.

## References
Surfaced while implementing `Splitter.svelte`; mirrors the perpendicular
`aria-orientation` rule already used in `MenuSeparator.svelte`.
