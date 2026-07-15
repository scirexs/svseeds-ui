# `$effect.pre` can read `validationMessage` before a synchronously-emitted value change has flushed to the DOM

**Applies to:** Svelte 5 runes (`$effect` / `$effect.pre`), observed in this repo's
Field components (`DateField.svelte`) as of the Svelte 5 runtime pinned in
`package.json`.

## Finding

`$effect.pre` runs before Svelte flushes reactive DOM updates; `$effect` runs
after. When a child component sets a value and then fires a native event (e.g.
`change`) synchronously — before Svelte's own reactive `value={...}` binding has
re-rendered the element — a validation effect that reads native
`validationMessage` in `$effect.pre` observes the element's *old* DOM value, not
the one just picked. The computed variant/error is stale for exactly one flush.

## Why it matters / how to apply

If a component validates DOM state derived from a reactively-bound value, and
that value can also be pushed synchronously by a child (not just by user
typing), reading `validationMessage` in `$effect.pre` is unsafe. Either move the
validation re-run to `$effect` (post-flush) or imperatively sync the target
element's value before reading validity on the synchronous call path. See
`.ws/decision/021-datefield-fresh-validity-read.md` for the applied fix and
rejected alternatives (including why moving only the `$effect.pre` → `$effect`
timing is not sufficient by itself for a synchronous `onchange` handler).

The other seven Field components still use `$effect.pre` + `validationMessage`
and may carry the same latent staleness for programmatic value changes made
while non-neutral — unverified, not yet checked.

## References

`DateField.svelte` `shift()` / `verify()`; ADR
`.ws/decision/021-datefield-fresh-validity-read.md`.
