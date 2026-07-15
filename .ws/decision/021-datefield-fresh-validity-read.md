# 021. DateField reads validity only from a freshly synced element

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-15
**Affects:** `DateField.svelte` variant/errmsg derivation; diverges from the
`$effect.pre` + `validationMessage` validation pattern shared by the seven other
Field components.

## Context

`DateField.shift()` derives `variant` and `errmsg` from the `validationMessage` of
its validation element: the hidden proxy `<input>` in the default path, or the
native `<input type="date">` under `native`. DateField drives that element's value
reactively (`value={value?.toString() ?? ""}`), so the DOM only receives a new
value at Svelte's next flush.

Two call sites read that validity before the flush:

- `DateInput.onPick` sets the value and then emits `change` synchronously, so
  DateField's `onchange` → `validate()` → `shift()` runs while the proxy is still
  empty.
- The validation re-run lived in `$effect.pre`, which by definition runs before
  DOM updates.

With `required` and `openOnFocus`, picking a valid date therefore left the field
`INACTIVE` — error styling on a valid, filled value — and nothing later corrected
it. The same staleness stuck a `native` field at `INACTIVE` after a programmatic
`value` change.

## Decision

Read validity only from an element whose DOM value is already current:

1. `verify()` writes `value` into the hidden proxy (`proxyEl.value = value?.toString() ?? ""`)
   before `_verify()` runs, so a same-tick `validationMessage` read is fresh.
2. The value-triggered validation re-run uses `$effect`, not `$effect.pre`, so it
   observes post-flush DOM.

The imperative write is restricted to `proxyEl`. The native element is never
written imperatively.

## Consequences

- The proxy write looks redundant beside the template's `value={...}` binding but
  is not: deleting it reintroduces the bug on the synchronous `onchange` path. A
  regression test asserts no transient error node, so removing it fails the suite.
- DateField's effect no longer matches the seven sibling Field components, which
  still use `$effect.pre`. The divergence is intentional; this ADR is the reason.
- The imperative write duplicates Svelte's flush write of the same string, so it
  is idempotent.
- The siblings keep the same latent staleness for programmatic value changes made
  while non-neutral. Out of scope here; routed to feedback.

## Rejected alternatives

- **Only move `$effect.pre` → `$effect`.** A one-token fix that repairs both paths,
  because the post-DOM effect re-runs `shift()` with fresh validity. Rejected: the
  synchronous `onchange` still computes `INACTIVE` first, so
  `<div role="alert">Please fill out this field.</div>` is really inserted into the
  DOM and removed on the next flush. It is a live region, so a screen reader can
  announce a false error. Confirmed with a MutationObserver over the pick flow —
  the node insertion is observable, even though the final variant is correct and
  no paint occurs.
- **Only sync the proxy.** Fixes the reported bug with one line and no transient,
  but `native` mode has no proxy, so its `$effect.pre` keeps reading stale validity.
- **Defer DateInput's change emission behind `tick()`.** Would make `change` fire
  asynchronously for every DateInput caller, including standalone use, to work
  around a DateField-internal ordering problem.
- **Derive validity from `value` instead of the DOM.** Constraint validation
  (`required`, `min`/`max`) is browser-owned; re-implementing it in JS would
  duplicate the platform and drift from it.
