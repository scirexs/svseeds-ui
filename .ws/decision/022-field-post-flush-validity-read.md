# 022. Field components read validity after the DOM flush

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-15
**Affects:** `TextField`, `SelectField`, `CheckField`, `FileField`, `NumberField`
variant/errmsg derivation; `NumberInput`'s text-sync timing and `bump()`.
Extends `021-datefield-fresh-validity-read.md` from DateField to its siblings.

## Context

ADR 021 fixed DateField's stale validity read and recorded that the seven sibling
Field components still validated in `$effect.pre` and might carry the same latent
bug — unverified at the time.

They were then verified. Five of the seven reproduce it: with the field non-neutral,
a programmatic value change computes `variant`/`errmsg` from the validation
element's pre-flush DOM value and nothing re-runs afterwards, so the field sticks at
`INACTIVE` over a valid value. The remaining two, `TagsInputField` and
`ToggleGroupField`, do not: their validation element is a bare hidden input carrying
no native constraints, so `validationMessage` comes only from `setCustomValidity`,
which `_verify` computes from the fresh value — there is no DOM value to go stale.

The five split into two shapes:

- `TextField`, `SelectField`, `CheckField`, `FileField` — the element's value lands
  at the flush, one step after `$effect.pre`. Their `onchange` fires from a real DOM
  event, so the DOM is already current on that path.
- `NumberField` — its child `NumberInput` copies the value into its own `text` state
  in a post-flush `$effect`, and `value={text}` needs a further flush to reach the
  DOM, so `value` → `text` → DOM spans two flushes across a child effect boundary.
  Separately, `NumberInput.bump()` (spin buttons, arrow keys) sets `text` and emits
  `change` synchronously, exactly like `DateInput.onPick`.

## Decision

Field components read validity only after the DOM they read it from is current.

1. The value-triggered validation re-run moves from `$effect.pre` to `$effect` in all
   five components.
2. `NumberInput`'s text-sync effect moves from `$effect` to `$effect.pre`, so `text`
   reaches the DOM in the same flush as the value change and NumberField's post-flush
   read is fresh. Its focus guard is unchanged.
3. `NumberInput.bump()` writes the new text into the element's DOM value before
   emitting `change`, so the synchronous listener reads fresh validity.

`TagsInputField` and `ToggleGroupField` are deliberately left on `$effect.pre`: they
have no stale-read path, so changing them would be churn.

## Consequences

- Six of the eight Field components now validate post-flush; only the two unaffected
  ones still use `$effect.pre`. ADR 021's note that DateField diverges from seven
  `$effect.pre` siblings is now historical.
- NumberField's correctness depends on NumberInput's sync timing — a cross-component
  contract between a coordinator and a child that also ships standalone. Moving
  NumberInput's sync back to `$effect` silently reintroduces NumberField's stuck
  `INACTIVE`; a regression test guards it.
- `bump()`'s imperative write looks redundant beside `value={text}` but is not:
  deleting it reintroduces a transient `role="alert"` node in a live region. A
  MutationObserver-based test asserts no insertion, so removing it fails the suite.
- FileField's `validate()` is ungated, so it is the only one whose mount-time variant
  now lands one flush later (`NEUTRAL` → `ACTIVE` with initial files). The other four
  early-return while neutral and are unchanged at mount.
- Each fixed component costs one extra render pass per programmatic value change. The
  recomputation is idempotent.

## Rejected alternatives

- **Move `$effect.pre` → `$effect` everywhere and stop.** Fixes four of the five.
  Rejected for NumberField, where it is measurably insufficient (the two-flush chain
  leaves it stuck at `INACTIVE`) and where it would still let `bump()` insert a
  transient false alert — the same ground ADR 021 rejected it on for DateField.
- **Give NumberField a hidden proxy input, as DateField has.** Would decouple
  validation from the child entirely and need no NumberInput change, matching
  DateField's shape. Rejected as disproportionate: it changes form participation and
  the meaning of `element` on a component whose bug two localized timing changes
  already fix.
- **Have NumberField write `element.value` itself before validating.** Rejected: the
  element is NumberInput's user-facing text input, and NumberField cannot see the
  child's `focused` state, so the write would clobber text the user is mid-way
  through typing — precisely what NumberInput's own focus guard exists to prevent.
- **Change all seven siblings uniformly for consistency.** Rejected: `TagsInputField`
  and `ToggleGroupField` were verified to have no stale-read path, so the edit would
  be churn against the "behaviour over cleanliness" rule.
