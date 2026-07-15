# 018. DateInput overlay default z-index via the cssvar bridge

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-15
**Affects:** DateInput public API (`DateInputCssVar`, `cssvar`); the library's convention for absolute-positioned overlays

## Context

`DateInput` renders its calendar overlay (`PARTS.BOTTOM`) as `position:absolute` with no
`z-index`, inside a `.whole` that is `position:relative` with `z-index:auto` — which does
not create a stacking context. The overlay therefore paints in the positioned layer at
`auto`, and any *later* positioned sibling paints over it. Two stacked `<DateInput>`s are
the canonical failure: the second's relatively-positioned root covers the first's open
calendar.

An input calendar is expected to render above adjacent content, so the library should
supply that by default rather than making every caller rediscover the defect.

Two forces constrain the fix:

- The library is headless — it ships no opinionated styles, and `z-index` is effectively
  global. Any value correct for one app is wrong for another, and callers who run a
  deliberate stacking scheme must be able to retarget it without fighting the component.
- A convention for bridging values to CSS custom properties already exists
  (`.ws/policy/coding-style.md` §13.1), and `DateInput` already uses its "direct consume"
  form for the overlay's x/y offsets (`--svs-position-x` / `--svs-position-y`).

## Decision

Emit `z-index: var(--svs-position-z, 1)` on the overlay's inline style, resolving the
custom-property name through the component's existing `cssvar` prop: `DateInputCssVar`
gains a `"z"` key, resolved with `_cssVar(cssvar, "z", "--svs-position-z")`.

The default fallback is `1` — the minimum that fixes the defect. `1` beats `auto` (0),
which is exactly enough to clear a later positioned sibling, while leaving a caller's own
layers alone (a `z-index:10` sticky header still wins).

Callers override at three escalating levels: accept `1`; set `--svs-position-z` from their
own CSS (globally or per instance, no prop wiring); or rename the property via
`cssvar={{ z: "--my-token" }}` to bind their own design token.

## Consequences

- The common stacked-inputs case works with no caller CSS.
- Callers with a stacking scheme get a documented hook and never need `!important` or a
  `styling` override to win.
- `1` and the `--svs-position-z` default name are now public API; changing either later is
  a breaking change for callers relying on the default.
- The overlay now always creates a stacking context (positioned with `z-index` ≠ `auto`),
  so descendant z-indexes are scoped to it. Benign today — the overlay contains only the
  `Calendar` or the caller's `children` — but it is a real behavior change.
- `ComboBox` has the same absolute overlay and the same defect, but exposes no `cssvar`
  prop. It is deliberately out of scope here and should adopt this same shape when
  addressed.

## Rejected alternatives

- **A hard-coded fixed `z-index` (e.g. `10`).** Simplest, and the first thing considered.
  Rejected: a headless library must not preempt the caller's stacking scheme, there is no
  correct universal value, and callers with a layer plan could only fight it with
  `!important`.
- **A dedicated numeric prop `zIndex?: number`.** Explicit and typed. Rejected:
  coding-style §13 routes CSS-value bridging through exactly three surfaces (`cssvar`,
  `duration`, `transition`); a fourth would fragment the convention and duplicate the
  `cssvar` hook the component already exposes for the sibling x/y offsets. It also cannot
  be set from caller CSS, so a global stacking policy would have to be threaded through
  every call site.
- **Do nothing; document that callers style `.bottom` themselves.** Rejected: the
  stacked-`DateInput` failure is a defect, not a styling preference, and every caller
  would rediscover and re-fix it.
- **Move the overlay to the top layer via the native Popover API,** as `Popover` and
  `Toast` do. This sidesteps `z-index` entirely and is the standards-first answer.
  Rejected as out of proportion to a default-styling fix: the overlay is anchored by
  absolute positioning plus the `_detectOverflow` flip logic (`data-svs-flip-x` /
  `data-svs-flip-y`) and a caller-supplied `transition`; the top layer would require CSS
  Anchor Positioning and rework the entire positioning, flip, and transition surface.
  Worth revisiting as its own task.
- **Default `auto`, exposing only the override hook.** Keeps current behavior while
  publishing `--svs-position-z`. Rejected: it does not fix the defect — every caller still
  has to opt in.
