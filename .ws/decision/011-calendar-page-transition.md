# 011. Calendar month-page slide transition

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-13
**Affects:** public API (Calendar `pageTransition` prop), Calendar.svelte grid anatomy

## Context

Calendar's existing `transition` prop only fires on the MonthPicker ⇔ grid mount/unmount (the `{#if picking}` switch); month navigation merely updates the derived `weeks`, so no enter/leave runs and the transition fn never receives a left/right direction. Users want a left/right slide when the shown month changes while the grid is visible (prev/next, keyboard, date-select month cross, external `display` change). Realizing it needs both a remount trigger on month change and a direction signal, without breaking the existing `transition` behavior.

## Decision

Add a separate optional `pageTransition?: TransitionProp` prop for the month slide, leaving `transition` (picker open/close) untouched. Detect direction centrally in the existing `display`/`value` `$effect.pre` by comparing the previous shown month with `Temporal.PlainYearMonth.compare` (`-1`/`0`/`+1`), store it in `dir`, and re-key the whole `.main` grid with `{#key currentDisplay().toString()}`, applying `transition:pfn|local={pparams}` where the library injects `dir` into the params. No default `fn` is bundled — the feature is opt-in, and an unset `pageTransition` resolves to `noop` (prior behavior).

## Consequences

- Existing `transition` users are unaffected; `pageTransition` is additive and backward-compatible.
- Direction is detected in one place, covering every navigation path (buttons, keyboard, date-select, picker, two-way `display`).
- A month change made from within the MonthPicker updates `display` and `dir` but does not itself slide: the grid is unmounted while picking, and the picker→grid return is a `|local`-suppressed mount. The slide covers month changes made while the grid is shown.
- Because the whole `.main` is re-keyed, the weekday-header row slides together with the week rows.
- The caller owns the slide `fn` and its container CSS (`position: relative; overflow: hidden`, to overlay the leaving grid); the library documents the requirement but does not enforce it.
- During a cross-slide two `.main` grids are briefly mounted; with `outsideDays`, shared day keys can transiently clash on `bind:this`, affecting focus only mid-transition.

## Rejected alternatives

- **Overload the existing `transition` prop** (synthesize `dir` into its params and branch on `dir === 0` vs `±1`): zero API surface, but mixes two distinct motions on one fn and changes month-navigation behavior for current `transition` users, weakening backward compatibility.
- **Keep the weekday header fixed via a keyed `role="rowgroup"` wrapper around the week rows**: visually cleaner, but the wrapper cannot be given a proper SVS styling part without adding a Calendar-specific entry to the shared `PARTS` enum (used across the component set); re-keying the whole `.main` is the more minimal, convention-consistent change, at the cost of the header sliding along.
