# In browser (`client`) tests, run `axe-core` directly — `vitest-axe`'s `axe()` helper breaks

**Applies to:** `vitest-axe@0.1.0` + `axe-core@4.12.1` under Vitest 4 browser
mode (`@vitest/browser-playwright`, chromium). Observed in this repo with these
versions.

## Finding

`vitest-axe`'s `axe()` runner cannot run in the browser (`client`) project. Its
entry (`vitest-axe/dist/index.js`) loads axe-core via Node's
`createRequire(import.meta.url)`, which does not exist in the browser bundle, so
importing it throws `(0, …).createRequire is not a function` and the test file
fails to import. The **matcher** (`toHaveNoViolations`) is unaffected — it is
registered fine via `vitest-axe/matchers` in the setup file.

## Why it matters / how to apply

Use `vitest-axe` only for the matcher, and run the audit with the bundled
`axe-core` directly. `axe.run(element)` returns a result shaped like what the
matcher expects (`{ violations, … }`), so:

```ts
import axe from "axe-core";
// ...
const { container } = render(MyComponent);
const results = await axe.run(container);
expect(results).toHaveNoViolations();
```

Matcher registration lives in `tests/client-setup.ts`
(`expect.extend(matchers)` + `import "vitest-axe/extend-expect"`), wired as the
`client` project's `setupFiles` in `vite.config.ts`. Do **not** `import { axe }
from "vitest-axe"` in a browser test. (In jsdom the `createRequire` path would
work, but per coding-style §16 accessibility tests default to the browser
environment for real layout-dependent rules.)

## References

Symptom: `Error: Failed to import test file … TypeError: (0 , __commonJSMin(…)(…)).createRequire is not a function` from `deps/vitest-axe.js`.
