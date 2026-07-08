# 001. Popover arrow via structural caret split + JS rect measurement

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-08
**Affects:** Popover public styling contract (parts `whole`/`main`/`top`/`bottom`/`left`/`right`, `data-svs-placement`); no prop-API change

## Context

Popover's `arrow` must render a speech-bubble caret that sticks out past the panel
frame and follows `autoFlip` reversal. Pure CSS cannot follow the flip: CSS Anchor
`@position-try` fallbacks apply only to the anchored element itself and only when
it overflows, so small carets desync from the panel; normal-flow children never
receive `@position-try`; and no CSS selector or inherited property lets a
descendant read which fallback the panel chose. The prior single `EXTRA` hook
could not point at the trigger after a flip.

## Decision

Split the arrow panel into a decorated `MAIN` body and sibling carets
(`TOP`/`BOTTOM`/`LEFT`/`RIGHT`), rendering only the one caret that points at the
trigger. CSS Anchor still owns positioning; a small internal `$effect` reads
`panel`/trigger `getBoundingClientRect()` on open/scroll/resize to determine the
resolved side and pick the caret. Decoration moves from the `whole` part to `main`;
the resolved side is exposed as `data-svs-placement`. Pre-release permits this
breaking styling-contract change.

## Consequences

- The caret follows flips with no user-written logic; users only style static
  per-direction carets and put decoration on `main`.
- Breaking: existing `arrow` users move decoration `whole`→`main` and replace
  `extra` with `top`/`bottom`(/`left`/`right`); non-arrow panels gain one `main`
  wrapper level.
- A minimal JS read path (rect measurement) is introduced; it runs only while
  `arrow` && `open`, rAF-throttled. This is result-reading, not JS positioning.
- `data-svs-placement` becomes part of the public contract.

## Rejected alternatives

- **Pure CSS `@position-try` per caret** — fails: carets don't overflow in sync
  with the panel (desync), and descendants can't read the chosen fallback.
- **Single caret with negative margin + dynamic `rotate`** — the prior shape;
  brittle, needs JS to flip the rotation anyway, and can't sit outside the frame
  cleanly.
- **Full JS positioning** — abandons the standards-first CSS Anchor approach and
  its reduced-motion/perf benefits for no gain; JS is limited to reading the
  resolved side.
