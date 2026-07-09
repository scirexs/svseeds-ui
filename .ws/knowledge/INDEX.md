# Knowledge Index

## Language & Types
- svelte-state-widens-object-string-literals.md — `$state({ key: "literal" })` widens string literals to `string`; annotate the type explicitly when passing reactive prop objects to typed components.
- ts-generic-htmlelement-excludes-constraint-validation.md — a generic `E extends HTMLElement` cannot access `validity`/`setCustomValidity` (declared per-concrete-interface, not on `HTMLElement`); narrow with a local cast internally instead of widening the public bound.

## Framework & Libraries
- svelte-native-event-handler-typing.md — intrinsic-element attrs (`onload`/`onerror`/`oninput`/…) type as a generic handler (not e.g. `EventHandler<InputEvent,…>`); keep the internal handler precisely typed and cast at the seam — narrow-cast inward for re-dispatch, widen-cast the handler at direct attribute assignment (e.g. `isComposing` access).
- svelte-bindthis-array-trim-on-shrink.md — `bind:this={arr[i]}` never clears entries for rows removed from a shrinking `{#each}` source; trim the collection to the live count/key set in an `$effect.pre` keyed on that source list, not by clearing the whole collection.
- svelte-rest-props-reemitted-aria-undefined-clobber.md — when rest-props include an attr the component re-emits as a computed value, destructure it out of rest; an explicit `undefined` after `{...rest}` silently erases the caller's attr.
- svelte-two-level-component-rest-props-on-role-element.md — in two-level components (root wrapper + inner role element), spread `...rest` on the role-bearing element, not the root; coding-style §14's default breaks WAI-ARIA accessible naming when root ≠ role element.
- sortable-commit-followers-remove-before-insert.md — `#commitFollowers` must splice followers out before calling `insertAfter`; `insertAfter` re-finds the leader by key so it re-derives the correct index after any preceding removals.
- sortable-keyboard-low-level-move-skips-sort-gate.md — `#moveTo()` is a low-level helper that skips the `sort` gate; keyboard (and any programmatic) move paths must call `#canSort()` before `#moveTo()`, just as the pointer path does.
- sortable-keyboard-follower-requires-grabbed-selected.md — keyboard grab only carries followers when the grabbed item is itself selected, unlike the pointer path which carries followers regardless; select the grabbed item too when testing/using keyboard follower moves.
- svelte-a11y-noninteractive-role-tabindex.md — Svelte's a11y checker flags `tabindex` on roles it doesn't treat as interactive (`role="separator"`, `role="status"`/`"alert"`) even when intentionally focusable; suppress with a narrow role-listing `svelte-ignore`.
- sveltejs-package-output-layout.md — `@sveltejs/package` passes `.svelte` through, compiles `_core.ts`→`_core.js`/`.d.ts` (dropping `_core.ts`), and emits no `package.json`; the post-build step must supply those.
- svseeds-object-styling-no-part-literal-class.md — object-form `styling` emits only user classes, not the literal part-name token; `querySelector('.label')` returns null in object mode — use `bind:this` instead.
- svelte-state-prop-initializer-warning.md — `$state` directly capturing a prop variable in its initializer triggers a Svelte warning; wrap the initial read in a tiny helper to suppress it while preserving one-time seed behavior.

## Build, Tooling & Dependencies
- bun-run-check-generates-svelte-kit-dir.md — `bun run check` runs `svelte-kit sync`, (re)generating a gitignored `.svelte-kit/` build dir; leave it in place, don't clean it up.
- bun-no-native-npm-publish-dry-run.md — no native `npm` on PATH; use `bunx --bun npm pack --dry-run` to inspect the npm file set; `bunx --bun npm publish --dry-run` can still fail on registry/version state.
- bun-run-fmt-rewrites-whole-src-lib.md — default `bun run fmt` runs `prettier --write` over the whole `./src/lib` tree; on a scoped task it picks up unrelated pre-existing formatting churn — validate with `BUN_FMT="<changed files>" bun run fmt:check` instead.
- prettier-markdown-exact-body-conflict.md — Prettier's Markdown formatting doesn't preserve a hand-authored exact-body doc (e.g. an ADR); scope `fmt:check` to exclude such files rather than reformatting them.

## Testing
- vitest-browser-userevent-skips-aria-disabled.md — `userEvent.click` is a no-op on `aria-disabled="true"` elements; dispatch a DOM `MouseEvent` directly to exercise a focusable aria-disabled handler.
- dateinput-test-fixed-date-drift.md — a test with a hardcoded target date breaks permanently (not intermittently) once real "today" advances past it, when the component under test defaults empty state from `Temporal.Now.plainDateISO()`.
- svelte-rerender-then-mutate-state-props-loses-reactivity.md — calling `rerender(props)` once then later mutating the same `$state` props object directly can break reactive tracking (`track_reactivity_loss`); pick one props-driving mechanism per test.

## Runtime & Platform
- css-flip-animation-spurious-pointerover.md — FLIP animation slides transformed boxes over the pointer, causing the browser to fire spurious `pointerover` on just-moved drag targets and reversing a committed reorder.
- core-browser-helper-caller-guards-ssr.md — `_core.ts` helpers touching `window` (e.g. `_detectOverflow`) carry no internal SSR guard; the calling component keeps the `typeof window === "undefined"` check before invoking them.

## Integration & Data

## Other
