# 007. Field lifecycle logic as rune-free `_core.ts` helpers, not a `createField` module

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-09
**Affects:** the 8 Field components (TextField, NumberField, SelectField, CheckField, FileField, DateField, TagsInputField, ToggleGroupField) and `src/lib/_svseeds/_core.ts`

## Context
The 8 Field components each re-implement the same ~40–60 lines of lifecycle
boilerplate (uid/id wiring, `errmsg`/`message`, aria id and `live` derivation, the
`validations` verify loop). Removing that duplication needs shared code. A natural
shape is a rune-based `createField()` factory owning the whole pattern, but runes
(`$state`/`$derived`/`$effect`) only run in `.svelte` / `.svelte.ts` modules, and
`$props`/`$bindable` are component-only — so a full factory would have to live in a
**new** `_core.svelte.ts` module and receive accessor callbacks. The packaging
pipeline, however, special-cases exactly one shared runtime module: `src/script/post.ts`
`copyMeta` copies `_core.ts` verbatim into `dist/`, `package.json` `files` and
`jsr.json` name it explicitly, and the CLI distribution (`jsr:@svseeds/cli`) ships it
unconditionally because `dep.json` only tracks `.svelte` imports, not `.ts`/`.svelte.ts`.
A second shared module would need parallel handling in all of those places or the CLI
would omit it and break consumers.

## Decision
Extract only the **rune-free** Field logic (id wiring, message/aria derivation, the
verify loop) into `_`-prefixed pure helpers in the existing `_core.ts`, and keep all
runes (`$state`/`$derived`/`$effect`/`$props`/`$bindable`) in the components, which
call the helpers. Do not add a new shared module.

## Consequences
- Zero change to the packaging/distribution surface; helpers ship inside `_core.ts`
  automatically and stay library-internal (never re-exported through `index.ts`).
- The thin per-component rune shells (`$state errmsg`, the `$derived` id/message/aria,
  the `$effect` neutral latch, `$effect.pre`) remain duplicated by design — that
  boilerplate is the price of not owning runes in shared code.
- Helpers must stay rune-free forever; a future need for shared reactive state would
  reopen this decision (and the packaging work it implies).

## Rejected alternatives
- **`createField()` in a new `_core.svelte.ts`** — cleanest ownership of the whole
  pattern, but forces a second special-cased shared module across `post.ts`,
  `package.json`, `jsr.json`, and the CLI dep-tracking, with real risk the CLI fails
  to ship it. Not worth the distribution surface for the boilerplate it would save.
