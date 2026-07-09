# Two-level Svelte components: spread rest-props on the role element, not the root

**Applies to:** Svelte 5; this project's coding-style §14 convention (rest/class on root by default); observed in this repo as of Tabs rest-props passthrough (task 20260708_itvs37).

## Finding

When a component renders a two-level structure — an outer wrapper with no ARIA role + an inner element bearing a role (e.g. `role="tablist"`, `role="dialog"`) — spreading `...rest` on the root per coding-style §14's default places ARIA attributes (`aria-label`, `aria-labelledby`, etc.) on the role-less wrapper instead of the role-bearing element. WAI-ARIA accessible naming must sit on the element that carries the role; a label on a role-less ancestor is silently ignored by assistive technology.

## Why it matters / how to apply

Deviate from §14 for any two-level component: spread `{...rest}` and merge the caller's `class` onto the **inner role-bearing element**, not the root wrapper. Spread `{...rest}` **before** component-owned attributes so callers cannot override owned semantics (`role`, `aria-orientation`, event handlers, etc.). Record the deviation in an ADR so reviewers do not "correct" it back to the root.

The outer wrapper should remain styling-only (no author passthrough). Moving the passthrough target later is a breaking API change.

## References

- `.ws/decision/002-tabs-rest-props-on-tablist.md` — the Tabs case that established this pattern
- coding-style §14 — the default (root) that does not apply when root ≠ role element
- WAI-ARIA Authoring Practices Guide — accessible name must be on the element with the role
