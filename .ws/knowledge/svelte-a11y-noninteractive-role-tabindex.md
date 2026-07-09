# Svelte a11y checker flags `tabindex` on roles it doesn't consider interactive

**Applies to:** svelte ^5.56.4, svelte-check ^4.7.1, as observed in this repo
(Splitter.svelte WAI-ARIA Window Splitter pattern; Toast.svelte per-toast
`status`/`alert` live region).

## Finding
Svelte's compile-time a11y checker (`a11y_no_noninteractive_tabindex`) only
recognizes a fixed set of roles as "interactive." It flags `tabindex="0"` on
any role outside that set even when the focusability is intentional and
correct per WAI-ARIA — observed for both `role="separator"` (APG Window
Splitter, keyboard-draggable) and `role="status"` / `role="alert"` (live
region toasts made focusable so an F6 "jump to notifications" shortcut can
land on them).

## Why it matters / how to apply
A focusable, non-interactive-by-the-checker's-definition role is a legitimate
pattern in both cases above. Suppress with a **narrow, role-listing**
`svelte-ignore` carrying the rationale, scoped to just that element:

```svelte
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions (WAI-ARIA Window Splitter uses a focusable, keyboard-draggable separator.) -->
```

```svelte
<!-- svelte-ignore a11y_no_noninteractive_tabindex (F6 moves focus to individual toasts.) -->
```

Name only the warning(s) actually triggered (Toast's case only trips
`a11y_no_noninteractive_tabindex`, not `..._element_interactions`, since it
has no non-pointer interactive handlers) and always include the reason, so
unrelated a11y issues on the same element still surface.

## References
Surfaced while implementing `Splitter.svelte` (separator case) and while
adding the Toast `status`/`alert` live-region roles (`Toast.svelte`, task
`20260709_c53ixc`).
