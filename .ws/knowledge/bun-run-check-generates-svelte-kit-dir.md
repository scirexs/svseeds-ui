# `bun run check` runs `svelte-kit sync` and (re)generates a gitignored `.svelte-kit/`

**Applies to:** @sveltejs/kit ^2.68.0, svelte-check ^4.7.1, as observed in this
repo's `check` script.

## Finding
`bun run check` invokes `svelte-kit sync` before `svelte-check`, which
(re)generates a `.svelte-kit/` directory in the repo root as a side effect. The
directory can appear in a tree that previously had none, but it is already listed
in `.gitignore` (`/.svelte-kit/`).

## Why it matters / how to apply
`.svelte-kit/` is expected, gitignored build output — not an unexpected change
and not a tracked file. **Leave it in place**: do not treat its appearance as
something to clean up, and do not move it to `/tmp/trash/` (the file-disposal
policy targets stray/temporary files, not regenerated build artifacts that
SvelteKit and later commands expect to exist). Removing it only forces another
`svelte-kit sync`.

## References
Surfaced while implementing `Splitter.svelte`, where the generated directory was
moved to `/tmp/trash/` before it was noticed that the path is already gitignored.
