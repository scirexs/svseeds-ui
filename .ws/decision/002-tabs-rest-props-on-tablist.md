# 002. Tabs forwards rest props and caller class to the tablist, not the root wrapper

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-08
**Affects:** `Tabs` public prop surface (`TabsProps`)

## Context

`Tabs` renders a two-level structure: an outer `PARTS.WHOLE` `<div>` (no ARIA
role) wrapping an inner `<div role="tablist">` (`PARTS.TOP`). Coding-style §14's
default is to spread `...rest` and merge the caller's `class` onto the root
(WHOLE) element. But WAI-ARIA APG requires the tablist's accessible name
(`aria-label` / `aria-labelledby`) to sit on the `role="tablist"` element, and
`Tabs` previously exposed no way to supply it. A single-element component like
`ToggleGroup` has no tension here — its root *is* the role element — but `Tabs`
does, because its root and its role element are different nodes.

## Decision

`TabsProps` extends `Omit<HTMLAttributes<HTMLDivElement>, "children" | "role" |
"aria-orientation" | "onfocusin">`. The caller's `class` and `...rest` are applied
to the inner `role="tablist"` element (spread before the component-owned `role` /
`aria-orientation` / `onfocusin`), **not** the WHOLE root. Per-part styling stays
with the `styling` prop and `PARTS.*` classes; the outer wrapper remains
styling-only with no author passthrough.

## Consequences

- Authors can name the tablist and pass arbitrary tablist attributes idiomatically,
  matching `ToggleGroup`'s rest-props convention.
- Caller `class` lands on the tablist, not the outermost element — a deliberate,
  documented deviation from §14's "rest/class on WHOLE" default for a two-level
  component. Reviewers should not "correct" it back to the root.
- The outer WHOLE wrapper stays styling-only; authors cannot attach attributes to it.
- Moving the passthrough target later would be a breaking API change.

## Rejected alternatives

- **Rest/class on the WHOLE root (strict §14).** The accessible name would land on
  a role-less wrapper, failing the APG requirement that it name the tablist.
- **Dedicated `aria-label` / `aria-labelledby` props only.** Minimal and
  a11y-scoped, but diverges from the library's established rest-props idiom and
  forecloses passing other tablist attributes.
- **Split `class`→WHOLE but `rest`→tablist.** Surprising and inconsistent; forces
  two mental models for where author input lands.
