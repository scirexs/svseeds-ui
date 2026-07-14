# 015. Calendar↔MonthPicker as a context coordinator, not a Composite

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-14
**Affects:** Calendar / MonthPicker public API (Calendar `children`; MonthPicker context contract); the date-picker composition family (future DateInput/DateField → Calendar).

## Context

Calendar embedded MonthPicker as a private Composite child, configured only through Calendar's
`monthPicker` bag. Callers could not supply their own MonthPicker declaratively, and the fixed
Composite shape would also block the intended `<DateInput><Calendar><MonthPicker/></Calendar></DateInput>`
nesting. The library already has a context-coordinator convention (`compound-components.md`) used by
Accordion↔Disclosure and each Field↔Input pair.

## Decision

Convert the Calendar↔MonthPicker relationship from Composite to context coordinator. MonthPicker
becomes dual-mode: it reads an optional `MonthPickerContext` (value / min / max / variant / styling)
and falls back to its own props when standalone. Calendar sets that context and gains a generic
`children?: Snippet` rendered in the picking slot; when `children` is present it replaces the
default internal MonthPicker (children wins over the `monthPicker` bag). The default (no-children)
path still renders an internal MonthPicker, now self-wired through the same context. This mirrors
Accordion's items/children duality and generalizes to the future DateInput → Calendar coordination.

## Consequences

- Callers can write `<Calendar><MonthPicker … /></Calendar>` and fully customize the picker; the
  `monthPicker` bag remains for the default path.
- MonthPicker gains a public context surface (`_getMonthPickerContext` / `_setMonthPickerContext`,
  `MonthPickerContext`) that must stay stable.
- The same pattern extends to `<DateInput><Calendar>…` nesting with no special mechanism.
- Calendar still imports MonthPicker for the default child, so the hard packaging dependency is
  unchanged.
- Standalone MonthPicker behaviour is unchanged (context absent ⇒ props path).

## Rejected alternatives

- Keep the Composite and expose more through the `monthPicker` bag: cannot express a caller-written
  child and does not generalize to the DateInput nesting.
- Bespoke prop/clone injection into the child: non-idiomatic in Svelte 5 and inconsistent with the
  existing context-coordinator convention.
- Make Calendar a full dual-mode child now (DateInput as coordinator): out of scope; deferred to a
  later task to keep this change minimal.
