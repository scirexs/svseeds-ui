# A generic `E extends HTMLElement` does not expose `validity`/`setCustomValidity`

**Applies to:** TypeScript's bundled `lib.dom.d.ts` (observed in this repo as of the
Svelte 5 / TypeScript toolchain pinned in `package.json`).

## Finding

`validity: ValidityState` and `setCustomValidity(message: string): void` (the HTML
Constraint Validation API) are declared per-interface on `HTMLInputElement`,
`HTMLSelectElement`, `HTMLTextAreaElement`, `HTMLButtonElement`,
`HTMLFieldSetElement`, `HTMLObjectElement`, `HTMLOutputElement` — not on the base
`HTMLElement`. A function generic over `E extends HTMLElement` therefore cannot
call `el.validity` or `el.setCustomValidity(...)` even though every concrete
element type callers pass in practice has them.

## Why it matters / how to apply

Keep the public signature `E extends HTMLElement` when that is the contract callers
need (e.g. a shared helper used across `<input>`, `<select>`, and custom
`elements[0]` targets), and narrow internally with a local cast just for the
constraint-validation members, e.g.:

```ts
const target = el as E & { validity: ValidityState; setCustomValidity(message: string): void };
```

Do not widen the public bound to a union of the concrete element interfaces just to
satisfy this — that leaks implementation detail into the signature and defeats the
point of the shared generic helper.

## References

`_verify<V, E extends HTMLElement>` in `src/lib/_svseeds/_core.ts`, added while
extracting the Field validation verify loop (ADR `.ws/decision/007-field-helpers-in-core.md`).
