# 012. Drop FileInput's `flip` prop instead of DOM-reordering aux

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-13
**Affects:** FileInput public props API (`flip` removed)

## Context

`FileInput` exposed `flip?: boolean` (default `false`) to render the `aux`
region **before** the drop-zone `<label>` instead of after. Because `aux` is a
real sibling `<div>` outside the label and receives the `remove` callback, it
may hold interactive controls, so `flip` changed the **DOM order** of aux vs the
zone — i.e. tab and screen-reader reading order, not merely visual order.

A caller wanting the aux region placed above the zone can already reorder it
**visually** with CSS `order`. But CSS `order` changes only visual order, never
DOM/focus order, so the two are not strictly equivalent: only `flip` could make
`aux` focusable/read before the input control.

## Decision

Remove `flip`. Callers reorder the aux region visually with CSS `order`. The
component no longer offers reordering, and we accept losing the DOM/focus-order
capability that `flip` uniquely provided.

## Consequences

- Smaller public API: one fewer prop and its two conditional aux branches.
- Visual reordering of aux becomes a caller CSS concern (`order`), not a prop.
- Making `aux` focusable/read *before* the input control is no longer
  supported. For a file input this contradicts the conventional focus model
  (primary control first, file list second), so the loss is judged immaterial;
  "input-first focus with the list rendered visually above" remains a meaningful
  order under WCAG 2.4.3.
- Reversible by re-adding the prop if a concrete need surfaces; this ADR records
  why we judged it un-needed.

## Rejected alternatives

- **Keep `flip`.** Retains genuine DOM/focus-order control, but no realistic
  scenario for a *file input* needs `aux` focusable-first; the extra prop and its
  branches are not justified by that marginal capability.
- **Keep `flip` but document the CSS-`order`-vs-`flip` distinction.** Still
  carries the prop and its conditional branches; the added documentation burden
  and API surface outweigh the benefit.
