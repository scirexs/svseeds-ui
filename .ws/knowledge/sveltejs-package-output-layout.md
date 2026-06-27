# `@sveltejs/package` output: passes `.svelte` through, compiles `_core.ts`, emits no `package.json`

**Applies to:** @sveltejs/package ^2.5.8 (svelte ^5.56.4), as configured in this
repo's `build` script.

## Finding
Running `@sveltejs/package` writes its output tree to `dist/` and:
- leaves `.svelte` component sources **unchanged**, generating a `.svelte.d.ts`
  sibling next to each;
- compiles `_core.ts` -> `_core.js` + `_core.d.ts`, but does **not** keep
  `_core.ts` in the output;
- copies plain sibling assets through automatically (e.g. `_svseeds/dep.json`
  appears in `dist/` without an explicit copy step);
- does **not** emit a `package.json` into `dist/`.

## Why it matters / how to apply
The post-build step is responsible for everything `@sveltejs/package` omits: it
must (re)copy `_core.ts` into `dist/_svseeds/` if the published source tree (JSR)
needs it, and it must synthesize `dist/package.json` itself. Do not expect a
manifest or the original `_core.ts` to be present after packaging. Confirm the
output dir is still `dist/` before wiring paths -- the whole assembly assumes it.

## References
Surfaced while reworking the build/publish pipeline (`post.ts` assembling
`dist/`); the cleaned `package.json`, `jsr.json`, `mod.ts`, and the `_core.ts`
copy all exist precisely because packaging does not produce them.
