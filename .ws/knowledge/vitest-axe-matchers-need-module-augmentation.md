# `vitest-axe`'s matcher types are invisible to `svelte-check` under Vitest 4 — augment locally

**Applies to:** `vitest-axe@0.1.0` matcher type declarations under Vitest 4 /
`svelte-check` (`bun run check`). Observed in this repo with these versions.

## Finding

`vitest-axe`'s `toHaveNoViolations` matcher type declarations target the old
`Vi` namespace, so `svelte-check` under Vitest 4 does not see it — a spec file
calling `expect(await axe.run(container)).toHaveNoViolations()` type-checks as
an error even though the matcher works fine at runtime (it is registered via
`expect.extend` in `tests/client-setup.ts`). This is a **type-only** gap; do not
confuse it with the separate runtime import issue covered in
[[vitest-axe-browser-use-axe-core-directly]].

## Why it matters / how to apply

Add a local module augmentation to each spec file that uses the matcher:

```ts
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  interface Assertion<T = any> extends AxeMatchers {}
}
```

This only fixes the type visibility; runtime registration in
`tests/client-setup.ts` still does the actual matcher wiring — no change needed
there.

## References

`feedback-implementer.md` / `request-fix2.md` of task `20260709_ssu33x`
(axe accessibility test rollout, batch 1).
