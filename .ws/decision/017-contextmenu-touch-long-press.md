# 017. ContextMenu touch long-press via pointer events

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-15
**Affects:** ContextMenu (internal interaction model); the library's touch long-press convention, shared with Tooltip

## Context

iOS Safari never fires the `contextmenu` event, so `ContextMenu` — which opened
only on `contextmenu` — could not be opened at all on iPad/iPhone. A long-press
gesture has to synthesize the trigger.

Three forces shaped the design:

- Android Chrome *does* fire `contextmenu`, at ~500 ms, while the finger is still
  down. Any timer-based path must not double-open on those devices.
- `ContextMenu` dismisses on a document `click`. A long press ends with
  `pointerup` → `click`, so the gesture that opens the menu also closes it.
- `Tooltip` already solves touch long-press in this library, using pointer events
  with a move threshold.

## Decision

Detect the long press with **pointer events** (`pointerdown` gated on
`pointerType === "touch"` and `isPrimary`, cancelled by `pointerup` /
`pointercancel` / a `pointermove` beyond 10 px), not touch events. The threshold
is a fixed 700 ms module constant, not a prop.

The `contextmenu` path stays authoritative: when `contextmenu` fires while the
long-press timer is pending, it cancels the timer and takes the open. A pending
timer is also what identifies the gesture as touch-originated.

An open caused by a touch gesture sets a flag that swallows exactly one
subsequent document `click`. The flag is cleared on the next `pointerdown`, so it
cannot persist and swallow an unrelated tap.

Suppressing iOS's native selection callout is left to the caller's CSS
(`-webkit-touch-callout: none; user-select: none;` on the target), documented in
the component's `@component` *Behavior*.

## Consequences

- Touch long-press is now a library convention with one shape: pointer events
  plus a move threshold. A third component needing it should follow Tooltip and
  ContextMenu rather than invent a touch-event path.
- One event model covers mouse, pen, and touch, so no touch/mouse event
  bookkeeping is duplicated.
- The trailing-click flag is invisible in the DOM and easy to break: any future
  change to the dismissal path must preserve both the swallow and the
  `pointerdown` reset, or the menu becomes either self-closing or undismissable.
- The fixed 700 ms is not tunable. Making it a prop later is additive and cheap;
  the prop would have to be named `delay` (as on Tooltip), since coding-style
  §13.2 reserves `duration` for motion timing.
- Callers who do not apply the callout CSS still get the menu on iOS, but with
  the native selection UI appearing during the press.

## Rejected alternatives

- **Touch events (`touchstart`/`touchmove`/`touchend`/`touchcancel`).** The shape
  most long-press references use, and it needs no `pointerType` gate. Rejected:
  it would leave the component straddling two event models (mouse via
  `contextmenu`, touch via touch events) and diverge from Tooltip's pointer-event
  precedent for the same gesture.
- **A `delay` prop for the threshold.** Rejected for now as unrequested API
  surface; 700 ms covers the requirement and the prop stays available later.
- **Component-applied inline style on `target`** to suppress the iOS callout.
  Rejected: it mutates a caller-owned element, and it cannot work at all in the
  default case where `target` is unset and the fallback is `document`.
- **Cancelling the long press on any `pointermove`.** Rejected: finger jitter
  fires `pointermove` constantly, so the gesture would rarely complete. Hence the
  10 px threshold, matching Tooltip.
