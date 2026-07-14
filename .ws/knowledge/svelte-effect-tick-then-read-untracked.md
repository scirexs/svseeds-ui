# Reading a prop inside `tick().then(...)` keeps it out of the `$effect`'s tracked dependencies

**Applies to:** Svelte 5 runes (`$effect`), observed in this repo's `DateInput.svelte`.

## Finding

An `$effect` tracks only the reactive values read during its **synchronous**
pass. A value read later, inside a `tick().then(() => { ... })` callback
attached from that effect, is not added to the effect's dependency set — the
effect will not re-run when that value changes, even though the callback's
behavior depends on it.

## Why it matters / how to apply

Use this deliberately to gate an effect's async side effect on a value without
making that value a reactive trigger for the whole effect. Example: an effect
keyed on `open` that calls `tick().then(() => { if (!parse) focusCalendar(); })`
only re-runs when `open` changes, not when `parse` changes — `parse` is read
post-tick purely to decide the callback's behavior for the current run. If the
callback's condition should instead re-run the effect when it changes, read the
value in the effect's synchronous body instead.

## References

`DateInput.svelte`'s open-time focus effect (task `20260714_xiaenh`): gates
`focusCalendar()` on `parse` inside the `tick().then(...)` callback so the
effect's dependency surface stays keyed on `open` only.
