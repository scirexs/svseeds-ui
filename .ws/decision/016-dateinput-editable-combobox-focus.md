# 016. DateInput keeps focus in the editable field; ArrowDown enters the calendar

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-14
**Affects:** DateInput focus/keyboard behavior (component-local; no public API change)

## Context
DateInput is a `role="combobox"` text input with a grid (`Calendar`) popup. It
supports two modes: read-only (no `parse`) where the calendar is the only value
entry path, and editable (`parse` supplied) where the user can also type a date.
`openOnFocus` defaults to true, so focusing the input opens the overlay. Until
now, opening always moved focus into the calendar grid. In editable mode this
made typing impossible: focusing to type immediately yanked focus into the grid.
We needed opening to stop stealing focus when the field is editable, while
keeping a keyboard path into the calendar and confirming the result is
accessible.

## Decision
When `parse` is supplied (editable), opening the overlay leaves focus in the text
input; the calendar is reached by Tab or by pressing ArrowDown in the input, which
opens the overlay if closed and moves focus into the grid's focusable cell. When
`parse` is absent (read-only), opening continues to move focus into the calendar,
since typing is not possible there. ArrowDown-to-enter applies in both modes.

## Consequences
- Editable DateInput follows the WAI-ARIA *editable combobox with grid popup*
  pattern: DOM focus stays in the textbox while the popup is open, and ArrowDown
  is the standard affordance to move into the popup — more accessible than the
  previous force-focus behavior.
- The open-time auto-focus is now conditional on `parse`, and `hkeydown` carries
  an ArrowDown branch (guarded against IME composition).
- Escape and date selection still return focus to the input, so the focus loop is
  closed in both modes.

## Rejected alternatives
- **Always move focus into the calendar on open (previous behavior).** Rejected:
  breaks typing in editable mode — the core bug.
- **Skip focus-stealing but provide no keyboard affordance (Tab only).** Rejected:
  Tab works but ArrowDown-into-popup is the expected combobox interaction; relying
  on Tab alone is a weaker keyboard experience.
- **Track the open trigger and only retain focus for focus/pointer-initiated
  opens.** Rejected: added state to distinguish trigger sources for a marginal
  gain; "editable ⇒ focus stays" is simpler and more predictable.
