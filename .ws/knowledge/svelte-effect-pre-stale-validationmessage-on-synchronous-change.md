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

Of the other seven Field components, five (`TextField`, `SelectField`,
`CheckField`, `FileField`, `NumberField`) were verified to carry the same latent
staleness for programmatic value changes made while non-neutral, and were fixed
the same way. Two (`TagsInputField`, `ToggleGroupField`) do not: their
validation element is a bare hidden input with no native constraints, so
`validationMessage` comes only from `setCustomValidity`, computed from the
already-fresh value — there is no stale DOM read to have.

`NumberField` needs an extra step beyond moving `$effect.pre` → `$effect`: its
child `NumberInput` copies the value into its own `text` state via an effect,
and `value={text}` needs a further flush to reach the DOM, so the chain
`value` → `text` → DOM spans two flushes across a child-component effect
boundary. Fixing it required moving the child's own sync effect to
`$effect.pre` too (so `text` reaches the DOM in the same flush as the value
change) *and* having `NumberInput.bump()` (spin buttons, arrow keys) write the
new value into the element's DOM value before emitting `change` synchronously,
since a synchronous listener still reads pre-flush state otherwise. Watch for
this two-part shape whenever a wrapper component buffers a prop into local
`$state` before it reaches the DOM.

## References

`DateField.svelte` `shift()` / `verify()`; ADR
`.ws/decision/021-datefield-fresh-validity-read.md`;
`.ws/decision/022-field-post-flush-validity-read.md` (siblings' verification and
`NumberInput`'s two-flush fix).
