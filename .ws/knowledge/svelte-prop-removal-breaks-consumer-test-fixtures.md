# Removing a component prop can break consumer test fixtures even when the consumer source never sets it

**Applies to:** Observed in this repo (Svelte 5 + TypeScript, `bun run check` running `svelte-check`), as of the `NumberInput`/`NumberField` components.

## Finding
When a public prop is removed from a component's props interface, `bun run check`
(type-checking) flags any place that still constructs a typed prop object
containing that key literal — including a **consumer's test fixtures** — even
if the consumer's actual *source* code never sets that prop. Checking only the
consumer component's source file is not sufficient to confirm "no downstream
change needed."

## Why it matters / how to apply
When scoping a prop removal (or any narrowing of a public props interface),
also search consumer **test files** (e.g. `tests/*.test.ts`) for literal usages
of the prop being removed — not just the consumer component source — before
declaring a sibling component out of scope. `bun run check` covers test files
too, so a removal can require updating stale test fixtures outside the
request's named test file.

## References
Task 20260711_b4wf33 (remove `integer` from `NumberInput`): the request assumed
`NumberField.svelte` needed no change because its source never sets `integer`,
but `tests/NumberField.svelte.test.ts` passed `integer` through a `numberInput`
prop bag and had to be updated too.
