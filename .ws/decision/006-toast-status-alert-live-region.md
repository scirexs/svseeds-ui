# 006. Toast announces via per-toast status/alert live-region roles with an explicit assertive flag

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-09
**Affects:** `Toast` public prop surface (`ToasterOptions.assertive`, `ToastAddOptions.assertive`,
`ToastItem.assertive`) and the per-toast ARIA role semantics

## Context

Toasts rendered each notification as `role="dialog"` with `aria-modal="false"`. A `dialog` is not
an ARIA live region, so a newly added toast was never announced to screen readers — the library's
notification surface was silent to assistive tech. Fixing this needs two choices: how to make new
toasts announce, and how to pick polite vs assertive urgency. A toast's `type` is an arbitrary
caller-supplied string, so the component cannot infer importance from it.

## Decision

Each toast's role becomes `status` (⇒ `aria-live=polite`) by default, or `alert`
(⇒ `aria-live=assertive`) when marked urgent; `aria-modal` is dropped. Urgency is an explicit
`assertive?: boolean` — a per-`add` option (`ToastAddOptions`) overriding a toaster-wide default
(`ToasterOptions`), both defaulting to `false`, surfaced on `ToastItem` so the template can read it.
The container keeps `role="region"` and its notification-count `aria-label`, and toasts stay
focusable (`tabindex="0"`) for the F6 jump.

## Consequences

- New toasts are announced without a separate hidden mirror node; the DOM stays a single tree.
- The public toast payload gains `assertive`; callers pick urgency explicitly rather than by naming
  convention.
- Toasts no longer claim `dialog` semantics they never truly had.
- Announcement now relies on screen readers announcing dynamically-inserted `status`/`alert`
  subtrees (well supported). If real-world robustness gaps appear, a persistent visually-hidden live
  region can be layered on later without changing the public API.

## Rejected alternatives

- **Keep `role="dialog"` and add a persistent visually-hidden live region that mirrors new toast
  text.** More robust for dynamic insertion, but adds a parallel DOM node and duplicated text, and
  leaves each toast mislabeled as a dialog.
- **Derive urgency from the `type` string** (e.g. `"error"`/`"alert"` ⇒ assertive). Forces a naming
  convention onto an arbitrary, caller-defined field.
- **Always polite (`role="status"`).** Simplest, but cannot announce genuinely urgent toasts
  immediately.
