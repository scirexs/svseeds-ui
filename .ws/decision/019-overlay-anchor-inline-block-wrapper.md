# 019. Overlay anchors resolve against an inline-block wrapper

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-15
**Affects:** ComboBox public API (`ComboBoxCssVar`, `cssvar`, `data-svs-flip-*`); ComboBox and DateInput `whole` wrapper display; the library's convention for absolute-positioned overlays

## Context

`ComboBox` and `DateInput` are the library's only two components that anchor an
absolutely-positioned overlay inside a `position:relative` wrapper (`PARTS.WHOLE`, a
`<span>`). Both flip the overlay per axis on viewport overflow via `_detectOverflow`.

Applying ADR 018's z-index decision to `ComboBox` required also deciding whether
`ComboBox` should expose the `cssvar` x/y offset keys `DateInput` already has. Measuring
the shared structure in chromium showed the offsets were resting on a broken foundation.

A `position:relative` **inline** `<span>` forms a containing block whose height comes from
font metrics, not from the `<input>` it wraps: measured 17px against a 32px input. Every
percentage y-anchor therefore resolves against the wrong basis:

- `top:100%` lands 8.5px *above* the input's bottom edge — overlapping the control.
- `bottom:100%` lands 6.5px *below* the input's top edge — also overlapping.
- The x-axis is unaffected: the inline box's width does hug the input, so `left:0%` /
  `right:0%` are correct.

This made `DateInput` wrong on both y-anchors, and `ComboBox` wrong on its flipped
anchor. `ComboBox`'s default anchor was accidentally correct only because it set no
`top` at all, leaving the listbox at its static position — which is also why it could not
offer a meaningful y-offset hook: with no explicit anchor, a caller setting the offset
property would jump the listbox to the wrapper's font-height box.

## Decision

Both components render `position:relative;display:inline-block;` on the `whole` wrapper,
as a component-owned inline style. The wrapper's box then coincides with the control it
wraps, so all four percentage anchors resolve against the control's box.

On that foundation, `ComboBox` adopts `DateInput`'s overlay shape wholesale: a `cssvar`
prop with `ComboBoxCssVar = "x" | "y" | "z"` resolved via `_cssVar` against the same
default names (`--svs-position-x` / `--svs-position-y` / `--svs-position-z`), the same
per-axis anchor expression, `z-index:var(--svs-position-z,1)` per ADR 018, and the same
`data-svs-flip-x` / `data-svs-flip-y` attributes.

Sharing the default property names across both components is deliberate: one
`--svs-position-z` definition in caller CSS governs every overlay in the library.

The display value is imposed inline rather than left to `styling`, matching
`position:relative`, which is already imposed there. Both are structural styles that the
anchoring mechanism owns; neither is an opinionated visual style, so this does not breach
the headless principle. A caller who overrides `display` on the wrapper takes ownership of
the resulting anchor geometry.

## Consequences

- Both overlays land where their anchors say, with no caller CSS.
- `ComboBox`'s x/y offset hooks are meaningful for the first time, because there is now an
  explicit anchor to offset from.
- Breaking: the `whole` wrapper is no longer a plain inline box. Its width is unchanged
  (measured 183px before and after), but its height now matches the control rather than
  the font, so baseline / `vertical-align` interactions can shift.
- Breaking: `DateInput`'s calendar and `ComboBox`'s flipped listbox move by ~8.5px /
  ~6.5px into their intended positions. Callers who compensated for the old overlap with
  their own offsets will now over-correct.
- The wrapper's `display` is now effectively public API; callers may override it, but own
  the anchor geometry when they do.
- `ComboBoxCssVar`, the `--svs-position-*` default names, the `1` z-index fallback, and
  the `data-svs-flip-*` attributes are public API for `ComboBox` from now on.
- Any future overlay component follows this same shape.

## Rejected alternatives

- **Add only the `z` key to `ComboBox` and leave positioning alone.** The smallest change
  that satisfies the original request, and it carries no visual risk. Rejected: it leaves
  `ComboBox`'s flipped anchor overlapping the input by 6.5px and `DateInput` wrong on both
  anchors, and it permanently blocks a meaningful y-offset hook, since an offset only has
  meaning relative to an explicit anchor. It also leaves the two structurally identical
  components with divergent implementations.
- **Expose x/y/z on `ComboBox` while keeping the inline wrapper.** Rejected: it regresses
  `ComboBox`'s default anchor by 8.5px — the one case that works today — in exchange for
  hooks that resolve against the font-height box.
- **Expose x/y with an `auto` fallback** (`top:var(--svs-position-y,auto)`), preserving
  today's static-position default. Rejected: it keeps the default correct but makes the
  hook a trap — a caller setting the property gets an offset measured from the wrapper's
  17px box, landing on top of the control. A hook that is wrong whenever it is used is
  worse than no hook.
- **Route the wrapper's `display` through a `cssvar` key or a `<style>` block** so callers
  can override it without inline-style specificity. Rejected as disproportionate:
  `position:relative` is already imposed inline with the same override cost, and coding-style
  §13.1 reserves the `cssvar` bridge for values the caller is expected to tune, not for
  structural styles the mechanism depends on.
- **Move the overlays to the top layer via the native Popover API.** Rejected for the same
  reason as in ADR 018: it would rework the entire positioning, flip, and transition
  surface. Still worth revisiting as its own task.
