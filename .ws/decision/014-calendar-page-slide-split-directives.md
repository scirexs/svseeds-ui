# 014. Calendar page slide via split `in:`/`out:` directives

**Status:** Accepted
**Supersedes:** 011-calendar-page-transition.md
**Date:** 2026-07-14
**Affects:** public API (Calendar `pageTransition` fn `direction` semantics), Calendar.svelte grid transition

## Context

ADR-011 applied a single bidirectional `transition:pfn|local={pparams}` to the re-keyed `.main` grid. Svelte passes `direction: "both"` to *both* the entering and the leaving element of a bidirectional `transition:`, so the caller's `fn` cannot tell enter from leave. The overlay slide ADR-011 assumed — overlay only the *leaving* grid with `position: absolute` while the *entering* grid stays in normal flow to supply the container's height — is unrealizable when `direction` is always `"both"`: the caller must treat both grids identically, so it either overlays both (in-flow height drops to `0`, `.middle`'s `overflow: hidden` clips the calendar, slide invisible) or neither. Measured: `.middle` height falls to `0px` mid-transition and restores on completion. This is a latent bug for any overlay-style `pageTransition` caller, not one demo's issue.

## Decision

Apply the page transition to `.main` as two separate directives sharing the same `pfn` and `pparams`: `in:pfn|local={pparams}` and `out:pfn|local={pparams}`, replacing the single bidirectional `transition:pfn|local={pparams}`. Svelte then passes `direction: "in"` to the entering grid and `direction: "out"` to the leaving grid, so the caller's `fn` can branch on direction and overlay only the leaving grid. The picker open/close `.middle` `transition:tfn|local` is unchanged — it is a MonthPicker mount/unmount that needs no enter/leave distinction.

## Consequences

- The caller's `fn` receives `direction: "in" | "out"` (never `"both"`) on a month change, so the overlay pattern ADR-011 documented works as intended: leaving grid `position: absolute`, entering grid in-flow, container height preserved.
- The `pageTransition: { fn, params }` public API shape is unchanged; only the `direction` value delivered to `fn` changes (`"both"` → `"in"`/`"out"`). The feature is new and its only consumer is the reference demo.
- Bidirectional `transition:`'s mid-flight reversal (a smooth rewind when one element rapidly toggles in↔out) is lost. Immaterial here: the keyed `.main` mounts a fresh element per month, so rapid navigation restarts `in`/`out` on a new element rather than reversing one.
- `pparams` (including the centrally detected `dir`) is shared by both directives, so direction detection in the `display`/`value` `$effect.pre` is unchanged.

## Rejected alternatives

- **Keep the bidirectional `transition:` and have the caller infer direction from `params.dir`**: `dir` says which way the *set* moved, not whether a given element is entering or leaving, so both grids still receive identical treatment and the overlay cannot apply to only one — the height collapse remains.
- **Drive the slide from caller CSS keyed off state/variant classes instead of a JS transition**: cannot measure the leaving grid's geometry for the absolute-overlay handoff; a directional cross-slide needs JS-measured motion (coding-style §13.3).
