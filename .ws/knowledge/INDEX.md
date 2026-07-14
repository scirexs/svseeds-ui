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
- sortable-entergroup-runs-after-item-over.md — native pointer event ordering fires item `pointerover` before list `pointerenter`, so `enterGroup` can run right after `over()`; it must no-op once the dragged item already resides in the target member or it clobbers the position `over()` set.
- svelte-a11y-noninteractive-role-tabindex.md — Svelte's a11y checker flags `tabindex` on roles it doesn't treat as interactive (`role="separator"`, `role="status"`/`"alert"`) even when intentionally focusable; suppress with a narrow role-listing `svelte-ignore`.
- sveltejs-package-output-layout.md — `@sveltejs/package` passes `.svelte` through, compiles `_core.ts`→`_core.js`/`.d.ts` (dropping `_core.ts`), and emits no `package.json`; the post-build step must supply those.
- svseeds-object-styling-no-part-literal-class.md — object-form `styling` emits only user classes, not the literal part-name token; `querySelector('.label')` returns null in object mode — use `bind:this` instead.
- svelte-state-prop-initializer-warning.md — `$state` directly capturing a prop variable in its initializer triggers a Svelte warning; wrap the initial read in a tiny helper to suppress it while preserving one-time seed behavior.
- wheelpicker-snap-dispatches-change-jump-does-not.md — `WheelPicker`'s `snap()` always dispatches native `change`; use `jump(index)` to re-settle the drum visually without firing `change` (e.g. a no-op selected-row tap).
- svelte-branch-transition-skips-unmounted-changes.md — a keyed `transition:fn|local` on an element living in only one `{#if}/{:else}` branch can't capture a value change made while that branch is unmounted; centrally detecting the change doesn't make it visually transition if the target isn't mounted for that path.
- svelte-crossfade-fallback-needs-explicit-params.md — `crossfade({ ...defaults, fallback })` doesn't auto-pass `defaults` (duration/easing) into the fallback; pass the same params explicitly inside the fallback callback (e.g. `fallback: (node) => fade(node, tp)`).
- svelte-animate-flip-skips-if-node-already-animating.md — `animate:flip` skips its FLIP positioning when the node already has a running transition (both write `transform`); don't let crossfade and FLIP own the same moving node — resolve a zero-duration flip param for nodes mid another transition.

## Build, Tooling & Dependencies
- bun-run-check-generates-svelte-kit-dir.md — `bun run check` runs `svelte-kit sync`, (re)generating a gitignored `.svelte-kit/` build dir; leave it in place, don't clean it up.
- bun-no-native-npm-publish-dry-run.md — no native `npm` on PATH; use `bunx --bun npm pack --dry-run` to inspect the npm file set; `bunx --bun npm publish --dry-run` can still fail on registry/version state.
- bun-run-fmt-rewrites-whole-src-lib.md — default `bun run fmt`/`fmt:check` walks both `${BUN_FMT:-./src}` and `${BUN_TEST:-./tests}` independently; scoping only `BUN_FMT` still checks all of `./tests` — set both vars to the changed files.
- prettier-markdown-exact-body-conflict.md — Prettier's Markdown formatting doesn't preserve a hand-authored exact-body doc (e.g. an ADR); scope `fmt:check` to exclude such files rather than reformatting them.
- svelte-component-comment-block-skips-prettier.md — Prettier doesn't format/lint inside the `@component` HTML comment, so `fmt:check` passing says nothing about whether its Types-block annotations still match the `Props` interface; verify that sync by hand.
- git-scope-creep-baseline-differs-per-file-after-dev-merge.md — once `dev` has merged into a task branch, a file whose source *and* test were both touched by the same upstream commit needs that commit (not `main`) as its additions-only baseline; other files in the same task may still need `main`.

## Testing
- svelte-prop-removal-breaks-consumer-test-fixtures.md — removing a public prop can fail `bun run check` in a consumer's *test* fixtures even when the consumer's source never sets that prop; check consumer test files too, not just source, before ruling a sibling component out of scope.
- vitest-browser-userevent-skips-aria-disabled.md — `userEvent.click` is a no-op on `aria-disabled="true"` elements; dispatch a DOM `MouseEvent` directly to exercise a focusable aria-disabled handler.
- dateinput-test-fixed-date-drift.md — a test with a hardcoded target date breaks permanently (not intermittently) once real "today" advances past it, when the component under test defaults empty state from `Temporal.Now.plainDateISO()`.
- svelte-rerender-then-mutate-state-props-loses-reactivity.md — calling `rerender(props)` once then later mutating the same `$state` props object directly can break reactive tracking (`track_reactivity_loss`); pick one props-driving mechanism per test.
- vitest-axe-browser-use-axe-core-directly.md — `vitest-axe`'s `axe()` helper breaks in browser mode (`createRequire` is Node-only); run `axe-core`'s `axe.run()` directly and pass the result to the `toHaveNoViolations` matcher.
- vitest-axe-matchers-need-module-augmentation.md — `vitest-axe`'s `toHaveNoViolations` matcher type targets the old `Vi` namespace and is invisible to `svelte-check` under Vitest 4; augment `vitest`'s `Assertion` interface with `AxeMatchers` locally in each spec file.
- svelte-pointer-gesture-test-needs-tick-after-synthetic-events.md — synthetic pointer-event dispatch doesn't wait for Svelte's DOM flush; `await tick()` before asserting post-gesture visual state or the assertion can pass against pre-update DOM.
- createrawsnippet-fixture-reactivity-needs-effect.md — `createRawSnippet`'s `render()` runs once; wrap reactive-argument reads in `$effect` inside `setup` to keep the fixture's rendered DOM synced with later argument changes.

## Runtime & Platform
- css-flip-animation-spurious-pointerover.md — FLIP animation slides transformed boxes over the pointer, causing the browser to fire spurious `pointerover` on just-moved drag targets and reversing a committed reorder.
- core-browser-helper-caller-guards-ssr.md — `_core.ts` helpers touching `window` (e.g. `_detectOverflow`) carry no internal SSR guard; the calling component keeps the `typeof window === "undefined"` check before invoking them. Exception: `shouldReduceMotion()` self-guards, so callers need no outer guard.

## Integration & Data

## Other
