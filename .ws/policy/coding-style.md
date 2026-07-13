# Coding Style

Project-specific coding conventions for **this project (svseeds-ui)**, read by
the cowork implementation and review agents (`impl` / `review`) and cited by their skills
(`cowork-impl`, `cowork-review`). This is the **single source of truth** for the
project's code style — update here, not in copies.

**Gold-standard files:** `TextField.svelte` and `Disclosure.svelte` are
hand-maintained and represent the intended style. When in doubt, match them.

## 0. Orientation

- **Change discipline:** behaviour over cleanliness; `_core` usually needs no
  change — say so when true. (The generic minimal / localized-change rule lives
  in the `impl` / `review` skills.)
- **Validation commands** (run from the repo root):
  - **Types / Svelte check:** `bun run check` — runs `svelte-kit sync` then
    `svelte-check`. (Regenerates a gitignored `.svelte-kit/`; leave it.)
  - **Tests:** scoped, `BUN_TEST="tests/<Name>.svelte.test.ts" bun run test`;
    whole suite, `bun run test`.
  - **Format check (non-destructive):** scoped — the standard for review —
    `BUN_FMT="<changed files>" bun run fmt:check`; whole tree, `bun run fmt:check`.
    The destructive `bun run fmt` (`--write`) is an *implementer-only* optional
    pass; never use it as a review validation step. See
    `.ws/knowledge/bun-run-fmt-rewrites-whole-src-lib.md`.
  - **Build (only when the change affects build output):** `bun run build` —
    regenerates `src/lib/index.ts` and `_svseeds/dep.json` for packaging, then
    removes those generated source files so `git status` stays clean.

## 1. Imports

Keep **type** imports separate from **value** imports — even from the same
module (a combined `import { type X, y } from "m"` trips a check/test warning).
Write the **value** imports as one block, then the **type** imports as a second
block; within each block order by source, as numbered below:

```ts
// value imports
import { someUtil } from "some-lib";              // 1. external libraries
import { untrack } from "svelte";                 // 2. "svelte"
import { slide } from "svelte/transition";        // 3. svelte sub-paths (svelte/attachments, …)
import { VARIANT, PARTS, _fnClass } from "./_core"; // 4. _core.ts
import Disclosure from "./Disclosure.svelte";     // 5. other components

// type imports — same source order
import type { Snippet } from "svelte";            // 2.
import type { FormEventHandler } from "svelte/elements"; // 3.
import type { SVSClass, SVSVariant } from "./_core";     // 4.
import type { DisclosureProps } from "./Disclosure.svelte"; // 5.
```

## 2. `$props()`

The `$props()` destructure is preceded by `// prettier-ignore` and kept on one
line. The exported `interface` already carries the shape, so the inline list
need not be readable — this avoids row bloat.

```ts
// prettier-ignore
let { children, open = $bindable(false), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: NameProps = $props();
```

## 3. `const` by default

Anything never manually reassigned is `const`, including `$derived` (Svelte
updates it; you never reassign it). Never write `let x = $derived(...)`.

## 4. Branching

- Guard clauses are single-line early returns: `if (cond) return ...;`.
- Prefer a one-line `if` generally.
- For `if`/`else`: if both arms warrant extraction, factor them into functions
  and write `cond ? ifFn() : elseFn();`; if each arm is a trivial one-liner, a
  plain `if {...} else {...}` is fine.

## 5. `$effect` / `$effect.pre`

Setup / teardown that can be expressed with `onMount` / `onDestroy` uses those
rather than `$effect` (e.g. an `$effect` returning a cleanup function). Reserve
`$effect` for genuinely reactive synchronization.

Place `onMount` / `onDestroy` at the **end** of the instance `<script>` — after
all `// *** … *** //` sections. See `WheelPicker.svelte`.

If the body is more than one line, extract a named function and call it inside
`untrack(() => …)`, reading only the intended reactive dependencies *outside*
`untrack`. This makes the reactive surface explicit and excludes unintended
reactivity.

```ts
$effect.pre(() => {
  dep;                         // intended reactive trigger(s), listed explicitly
  untrack(() => sync());       // body extracted; no incidental reactivity
});
```

## 6. Naming

Terse local names, ideally a single word. Keep it short even when one word does
not quite fit.

## 7. Section banners

Divide the `<script lang="ts">` body with `// *** Label *** //` banners.
Canonical labels, in order:

1. `Initialize`
2. `States`
3. `Reactive Handlers` — the `$effect` / `$effect.pre` / `$derived` reactive glue.
4. `Event Handlers` — the `hXxx` DOM handlers.

Specialized labels exist where needed (`Initialize Context`, `Menu Helpers`, …),
but reuse a canonical label whenever it fits.

`onMount` / `onDestroy` come after the Event Handlers section, at the end of the
instance `<script>` (§5).

## 8. Event handlers vs control functions

- A function ultimately assigned to an element or `svelte:document` is named
  `hXxx` and defined as a **`const` arrow**, not a `function`:
  ```ts
  const hclick = (ev: MouseEvent) => { ... };
  ```
- **Exception — internal control/action functions** (`hide`, `close`, helpers)
  stay `function`. They hoist, so they can be forward-referenced (e.g. inside an
  `$effect.pre` setup or a context getter declared above them). Converting those
  to `const` arrows risks a temporal-dead-zone (TDZ) error. Convert to `const`
  arrow **only** handlers with no forward reference.
- **Type the arrow, not the body.** Annotate the `const` with the matching
  handler type from `svelte/elements` so both `ev` and `ev.currentTarget` are
  inferred. Do not annotate the parameter (`(ev: Event)`) and cast inside — that
  forces an `ev.currentTarget as HTMLInputElement` on every access and loses the
  payload type.
  ```ts
  // good — currentTarget is HTMLInputElement, no cast
  const hinput: FormEventHandler<HTMLInputElement> = (ev) => {
    if (!legal(ev.currentTarget.value)) ...;
  };
  const hbeforeinput: EventHandler<InputEvent, HTMLInputElement> = (ev) => { ... };
  ```
  Pick the type by event family: `EventHandler<EvType, Element>` is the general
  form (pass the event type explicitly, e.g. `InputEvent`);
  `FormEventHandler<Element>`, `KeyboardEventHandler<Element>`, etc. are the
  `Event` / `KeyboardEvent` specializations. Properly typed `currentTarget` also
  lets re-dispatch (`onchangeProp?.(ev)`, `oninvalidProp?.(ev)`) drop its
  `as any` — see §9.

## 9. `as any`

Avoid it. Prefer an explicit type, or `unknown` when the value is genuinely
unknown. Narrowly allowed when the justification is strong **and** it sharply
reduces type verbosity — the gold standard uses it deliberately for event
re-dispatch (`onchange?.(ev as any)`) and `{...rest as any}` spreads.

## 10. Complex state

When control logic grows heavy, consider a class to encapsulate it instead of
scattered `$state` / `$derived`.

## 11. `@component` comment

Document the component with a leading `@component` comment. Sections, in order:
`Usage` → `Types` → `Anatomy` → `Exports` (optional) → `Behavior` (optional).

- **Usage** — a one-line note on how the component is used (standalone / child /
  wrapper / coordinator), followed by a minimal `svelte` snippet. Reference
  sibling components by name. Keep runtime behaviour under *Behavior*.
- **Types** — the `Props` interface plus the public types/interfaces it depends
  on (event payloads, item shapes, etc.). All `type`/`interface` belong here,
  even when also exported. Do **not** list `xxxReqdProps` / `xxxBindProps` or
  internal Context interfaces.
- **Anatomy** — a `svelte` sketch of the DOM the component renders, written for
  the *user* of the component rather than copied from the template. Keep the
  element tree and the `class="…"` names (the SVS styling parts); show
  component-owned attributes bare as markers (`role`, `aria-*`, `popover`,
  `style`, `type`, `transition:…`, `data-*`) with values omitted; collapse
  caller-supplied attributes to `{...rest}`; render snippets/children as
  `{name}`. Keep `{#if}` / `{#each}` only where the branch changes which element
  is rendered (e.g. `<textarea>` vs `<input>`); for an element merely present or
  absent, mark it with the pseudo-attribute `conditional`, adding the trigger
  after a colon when not obvious (`conditional: label or aux`).
- **Exports** — optional; document only the public **functions, `const`s, and
  `class`es** the component exports, each with a brief `//` comment. Never list
  `_`-prefixed library-internal helpers (e.g. `_PRESET`, `_getXxxContext`); never
  list `type`/`interface` here (they go under *Types*); omit the whole section
  when there is nothing public to document.
- **Behavior** — optional; notes that fit no section above — the interaction /
  keyboard model, exposed `data-*` attributes, embedded/context coordination and
  what is delegated to child components, focus and dismissal handling. Omit when
  the other sections already cover everything.

## 12. `Props` interface property order

In each component's exported `Props` interface (e.g. `DisclosureProps`), list
required properties first, before any optional (`?`) properties. This surfaces
the mandatory shape at a glance.

## 13. Motion & CSS custom properties

Components bridge values to/from CSS custom properties through **one convention**
so callers learn it once. Two orthogonal axes: **data direction** (consume vs
mirror) and **prop surface** (`cssvar` for property names, `duration` for timing,
`transition` for JS-measured motion). The shared helpers `_cssVar`,
`_cssVarStyle`, `_resolveDuration` (from `./_core`) implement it — do not
re-derive their logic per component.

### 13.1 The `cssvar` prop (custom-property bridge)

- Shape is always `cssvar?: Partial<Record<Key, string>>` — a map from a
  component-defined semantic `Key` to the **custom-property name** the component
  reads from or writes to. `Key` is a small string-literal union declared next to
  the `Props` interface (e.g. `"active" | "inactive"`, `"itemHeight" | "visible"`).
- **Consume** (something reads `var(name)`) — two forms:
  - *direct* — the component reads `var(name)` in an inline style it builds;
    resolve the name with `_cssVar(cssvar, key, defaultName)` (e.g. Slider's
    gradient reads `var(--color-active)`). Renaming swaps which name is read.
  - *canonical-with-override* — the component and/or caller CSS read a **fixed**
    canonical `--svs-*` name from static `<style>`. Make it renameable by emitting
    `--svs-name: var(<cssvar?.key>, <computed>)` (caller token if present, else
    the computed value). Static CSS keeps reading the canonical name, so renaming
    is honored without touching `<style>` (e.g. `duration` in Modal/Drawer).
- **Mirror** (component writes a computed value out for the caller's CSS, opt-in)
  — build the inline style with `_cssVarStyle(entries)`, each entry
  `{ name: cssvar?.[key], value }`; emit only the keys the caller named (no
  fallback). The component does not read these back (e.g. WheelPicker's
  `itemHeight`).
- **Prefer renameable** over fixed names: expose a `cssvar` key for any custom
  property a caller might wire to their own tokens. Use the opt-in mirror form
  only for values the component does not consume itself.
- **Default-name namespace.** Component-owned default names are namespaced
  `--svs-*` (e.g. `--svs-duration`, `--svs-item-height`). **Exception:** a
  *consume* default meant to bind to the caller's design tokens stays
  non-namespaced — currently only Slider's `--color-active` / `--color-inactive`.
  Document the reason in that component's `@component` *Behavior*.
- **Override semantics (canonical-with-override).** A caller token
  (`cssvar={{ duration: "--my-fast" }}`) overrides the prop-derived value via the
  `var()` fallback chain — caller token wins when defined, the `duration`/`motion`
  prop value is the fallback. **Reduced motion is enforced only on the computed
  fallback**: a caller supplying their own token owns honoring
  `prefers-reduced-motion` for it. Note this in *Behavior* where it could
  surprise.

### 13.2 The `duration` / `motion` prop & reduced motion

- Time-based motion exposes `duration?: number` (ms). Resolve it with
  `_resolveDuration(duration)`, which returns `0` under `prefers-reduced-motion`,
  the shared `_DEFAULT_DURATION` for the unset sentinel (`-1`) / invalid input,
  else the value. Do **not** re-derive the `_isUnsignedInteger` +
  `_DEFAULT_DURATION` + `shouldReduceMotion` logic per component.
- The motion-timing prop is named `duration` everywhere — including FLIP
  (`animate:flip`) list motion. **Exception:** when `duration` already denotes a
  *domain* concept on the same component, name the motion-timing prop
  `motion?: number` instead (same `_resolveDuration`, same `--svs-duration` var).
  The only current case is Toast, where `duration` is the per-toast dismiss
  timeout, so its flip timing is `motion`.
- Where motion is CSS-driven, expose the resolved value through the canonical
  `--svs-duration` custom property (renameable, §13.1 canonical-with-override) so
  caller CSS shares the reduced-motion-aware timing. JS-only motion
  (`animate:flip`, a Svelte `transition`) MAY pass the resolved value straight to
  the directive and skip the CSS var.

### 13.3 The `transition` escape hatch (JS-measured motion)

- When enter/leave cannot be expressed in CSS because it needs JS measurement
  (auto height, directional swap), expose `transition?: { fn; params }` and apply
  it as `transition:fn|local={params}`, rather than hardcoding a specific
  `svelte/transition` import. `fn` MAY default to a sensible built-in (e.g.
  Disclosure defaults to `slide`) so the common case needs no caller wiring while
  remaining swappable.
- This is the **only** motion surface not routed through CSS variables.
  CSS-expressible motion (open/close opacity, transform, scale on state/part
  variant classes) is left to caller CSS keyed off the `active`/variant classes —
  do not pull it into a Svelte transition.

## 14. Component shape & `_core`

Components live in `src/lib/_svseeds/<Name>.svelte`. Import shared primitives from
`./_core` (file `_core.ts`) — do not re-implement them: `VARIANT`, `PARTS`,
`_fnClass`, `_createContext`, and helpers (`_omit`, `_isNeutral`,
`shouldReduceMotion`, `_resolveDuration`, `_cssVar`, …; see `_core.ts` for the
full set).

File skeleton — the position of the major elements:

```svelte
<script module lang="ts">
  // exports only (see "<script module> exports" below): Props, ReqdProps, BindProps, _NAME_PRESET
  export interface XxxProps {
  }
</script>

<!---------------------------------------->

<script lang="ts">
  // imports first, then `// *** … *** //` banners: Initialize / States / Reactive Handlers / Event Handlers (§7)
  // prettier-ignore
  let { /* …, class: c, ...rest */ }: XxxProps = $props();
</script>

<!---------------------------------------->
<svelte:head>
  <!-- only if needed; place any svelte:* tag at this position -->
</svelte:head>

<tag class={[cls(PARTS.WHOLE, variant), c]} {...rest}>
</tag>

<style></style> <!-- only when definitely necessary -->
```

`<script module>` exports, in order:

```ts
export interface NameProps extends Omit<HTMLXAttributes<HTMLXElement>, "children" | <owned attrs>> {
  // required props first (§12), e.g.:
  children: Snippet<[string]>;        // Snippet<[variant]>
  // …feature props…
  attach?: Attachment<HTMLXElement>;
  element?: HTMLXElement;             // bindable
  styling?: SVSClass;
  variant?: SVSVariant;              // bindable; default VARIANT.NEUTRAL
}
export type NameReqdProps = "children";                       // required prop names, or `never`
export type NameBindProps = "open" | "variant" | "element";  // bindable prop names
export const _NAME_PRESET = "svs-name";                      // class namespace (kebab, `_NAME_PRESET`)
```

Instance `<script>`:

- Keep `class` **out** of the `Omit` so it merges; destructure as
  `class: c, ...rest`.
- Derive the class fn and apply parts:
  `const cls = $derived(_fnClass(_NAME_PRESET, styling));` →
  `class={[cls(PARTS.WHOLE, variant), c]}` (caller `c` merged last).
- Spread `{...rest}` **before** component-owned identity attrs (`id`, `role`,
  `type`, event handlers) so callers cannot override the component's semantics.
- Keep the `@component` *Types* block and `NameProps` in sync — any prop
  add/rename touches both (§11).

## 15. Context & compound components

For a component that coordinates children:

- Define the context type and its accessor pair in the **child / primitive**'s
  `<script module>`:
  `export const [_getNameContext, _setNameContext] = _createContext<NameContext>();`
  `_get…()` returns `undefined` when used standalone (no throw).
- The **coordinator imports the setter**; dependency direction is coordinator →
  child.
- A child supporting both modes reads context and falls back to its own props:
  `const ctx = _getNameContext();` then `effVariant = ctx ? ctx.variant : variant`,
  `cls = _fnClass(preset, styling ?? ctx?.styling)` (the caller's own `styling`
  still wins).

For the full compound/context patterns (flat pass-through vs coordinator, data
arrays, element mirroring, function bindings) see
`.ws/policy/compound-components.md`.

## 16. Tests

- **Default to the browser (`client`) environment** — write
  `tests/<Name>.svelte.test.ts`, run under real chromium, and include
  accessibility (axe) checks there. Fall back to the `simulation` (jsdom)
  environment (`tests/<Name>.svelte.sim.test.ts`) only when a browser test is
  impractical (precise fake timers, mocked geometry / `window` dimensions, …).
  For running axe in the browser see
  `.ws/knowledge/vitest-axe-browser-use-axe-core-directly.md`.
- Test file: `tests/<Name>.svelte.test.ts`; import the component via
  `#svs/<Name>.svelte` and shared values via `{ PARTS, VARIANT } from "#svs/core"`.
- Use `createRawSnippet` for simple snippet children; add a fixture under
  `tests/fixtures/*.svelte` when children must be real components or when a
  `$state`-backed context provider is needed (an ancestor must call the setter).
- Run with the §0 validation commands.
