# Knowledge Index

## Language & Types

## Framework & Libraries
- svelte-native-event-handler-typing.md — intrinsic-element `onload`/`onerror` type as a generic `EventHandler`; keep the public prop precise and cast the internal DOM handler narrowly.
- svelte-a11y-separator-not-interactive.md — Svelte's a11y checker flags a focusable `role="separator"` (APG Window Splitter); suppress with a narrow role-listing `svelte-ignore`.
- sveltejs-package-output-layout.md — `@sveltejs/package` passes `.svelte` through, compiles `_core.ts`→`_core.js`/`.d.ts` (dropping `_core.ts`), and emits no `package.json`; the post-build step must supply those.

## Build, Tooling & Dependencies
- bun-run-check-generates-svelte-kit-dir.md — `bun run check` runs `svelte-kit sync`, (re)generating a gitignored `.svelte-kit/` build dir; leave it in place, don't clean it up.
- bun-no-native-npm-publish-dry-run.md — no native `npm` on PATH; use `bunx --bun npm pack --dry-run` to inspect the npm file set; `bunx --bun npm publish --dry-run` can still fail on registry/version state.
- build-generates-untracked-index-dep.md — `bun run build` writes `src/lib/index.ts` and `_svseeds/dep.json` as untracked, NON-gitignored files (only `dist/` is ignored); they linger in `git status`.

## Testing

## Runtime & Platform

## Integration & Data

## Other
