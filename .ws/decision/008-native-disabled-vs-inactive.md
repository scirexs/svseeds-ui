# 008. Native `disabled` for form controls and nav items; `inactive` reason string for focusable non-form controls

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-10
**Affects:** the disable API across components — Button and Disclosure (`inactive`), Accordion (this change), and the `disabled` prop on HotkeyCapture, DateField, ToggleGroupField, MenuList/MenuItem, Tabs, Calendar, WheelPicker

## Context
Two disable idioms coexist. Button exposes `inactive?: string` and Disclosure
`inactive?: string | boolean`: a soft-disable that keeps the element focusable,
sets `aria-disabled` plus `aria-description` (the reason is announced), flips the
variant to INACTIVE, and suppresses the action. Most other components expose
`disabled?: boolean`, mapping either to the native HTML `disabled` attribute on an
`<input>`/`<button>`/`<select>` or to `aria-disabled` on a per-item nav element.

A review asked whether to unify everything on the `inactive` reason pattern. A
blanket conversion is not viable: native `disabled` on a real form control is
required for correct form semantics (the control is excluded from submission and
removed from the tab order), which `aria-disabled` does not provide; and per-item
nav disable (MenuItem, tabs, calendar days, wheel options) is inherently a boolean
per item, where a reason string does not fit and would inflate the API surface.
At the same time, Accordion — which forwards each item to a Disclosure — was
collapsing Disclosure's `inactive` capability down to a boolean, silently dropping
the reason a caller could otherwise pass.

## Decision
Keep both idioms with an explicit boundary:

- Use native `disabled: boolean` for (a) actual form controls whose rendered
  element is an `<input>`/`<button>`/`<select>` (e.g. HotkeyCapture, DateField,
  ToggleGroupField options, WheelPicker options) and (b) items disabled per-item
  for roving or virtual focus (MenuItem, Tabs, Calendar days).
- Use the `inactive` reason pattern — `inactive?: string`, or
  `string | boolean` where a reason-less soft-disable is also wanted — for
  focusable non-form controls that stay in the tab order and benefit from an
  announced reason: Button and Disclosure.
- A coordinator wrapping such a control surfaces the child's `inactive` rather
  than degrading it to a boolean: Accordion forwards `inactive` to Disclosure.

## Consequences
Callers learn one rule for which prop a component exposes; form-control
correctness and per-item nav semantics are preserved; disable reasons are
announced where they add value. The cost is that two idioms remain rather than a
single uniform prop, so adding a disable to a new component requires classifying
it against the boundary above. Accordion's item field is renamed
`disabled` → `inactive`, a breaking change for that item type.

## Rejected alternatives
- **Blanket `inactive` everywhere.** Breaks native form disabling (submission and
  focus semantics), forces awkward per-item reason strings onto nav lists, and is
  a large breaking change — rejected against the project's minimal/localized
  change principle.
- **Status quo (leave Accordion boolean-only).** Keeps a coordinator silently
  discarding a capability its child supports — rejected as the one inconsistency
  worth closing.
