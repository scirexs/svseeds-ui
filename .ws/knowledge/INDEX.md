# Knowledge Index

## Language & Types

## Framework & Libraries
- svelte-native-event-handler-typing.md — intrinsic-element `onload`/`onerror` type as a generic `EventHandler`; keep the public prop precise and cast the internal DOM handler narrowly.
- svelte-a11y-separator-not-interactive.md — Svelte's a11y checker flags a focusable `role="separator"` (APG Window Splitter); suppress with a narrow role-listing `svelte-ignore`.
- sveltejs-package-output-layout.md — `@sveltejs/package` passes `.svelte` through, compiles `_core.ts`→`_core.js`/`.d.ts` (dropping `_core.ts`), and emits no `package.json`; the post-build step must supply those.
- svseeds-object-styling-no-part-literal-class.md — object-form `styling` emits only user classes, not the literal part-name token; `querySelector('.label')` returns null in object mode — use `bind:this` instead.

## Build, Tooling & Dependencies
- bun-run-check-generates-svelte-kit-dir.md — `bun run check` runs `svelte-kit sync`, (re)generating a gitignored `.svelte-kit/` build dir; leave it in place, don't clean it up.
- bun-no-native-npm-publish-dry-run.md — no native `npm` on PATH; use `bunx --bun npm pack --dry-run` to inspect the npm file set; `bunx --bun npm publish --dry-run` can still fail on registry/version state.
- bun-run-fmt-rewrites-whole-src-lib.md — default `bun run fmt` runs `prettier --write` over the whole `./src/lib` tree; on a scoped task it picks up unrelated pre-existing formatting churn — validate with `SVS_FMT="<changed files>" bun run fmt:check` instead.

## Testing
- vitest-browser-userevent-skips-aria-disabled.md — `userEvent.click` is a no-op on `aria-disabled="true"` elements; dispatch a DOM `MouseEvent` directly to exercise a focusable aria-disabled handler.

## Runtime & Platform

## Integration & Data

## Other
