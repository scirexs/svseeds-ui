# Fixed-date test target drifts permanently once real "today" passes it

**Applies to:** `tests/DateField.svelte.test.ts` as of this repo's `Calendar.svelte`,
which seeds an unset value's displayed month from `Temporal.Now.plainDateISO()`.

## Finding

Two `DateField` calendar-open tests locate the day cell to click via a helper
with a hardcoded target date (`2026-06-21`). `Calendar` renders the month for an
*undefined* `value` from `Temporal.Now.plainDateISO()` — i.e. the real current
date. Once the real date advances past the hardcoded target's month, that day is
no longer in the rendered grid, `day(container)` returns `null`, and
`userEvent.click(day(container))` throws
`TypeError: Cannot read properties of null (reading 'click')`.

This is **not** an intermittent flake: once the real date crosses the boundary,
the test fails on every run from then on, forever (a one-way drift, not a
transient race).

## Why it matters / how to apply

Before writing off a suite failure as "flaky" or "known/pre-existing", check
whether it correlates with elapsed real time rather than environment noise —
especially near a component that defaults empty state from `Temporal.Now.*` /
`Date.now()`. The fix is one of: make the test pick a day dynamically from the
rendered month, seed an explicit `value` so the display month is deterministic,
or freeze the test clock.

## References

Failing tests: "picking a calendar day syncs the field value and participant",
"re-runs custom validations and blocks submit when a calendar day is picked".
Task `20260709_qzv7t6` handover notes root-caused this via the failure
screenshot (calendar open to the current real month, fixed helper day absent).
