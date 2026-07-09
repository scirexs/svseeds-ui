# Project Overview — SvSeeds (`svseeds`)

SvSeeds is a headless Svelte 5 UI component library that ships unstyled,
accessible "seeds" of common functionality, so developers can focus on
application logic while keeping complete control over styling.

## Purpose

The library exists to remove two recurring costs of building UI in Svelte:
re-implementing common interactive/accessibility behavior, and fighting a
component library's built-in styles. SvSeeds solves this with a
**"hide functionality, expose styling"** model — a single component's internal
structure is encapsulated behind a flat prop API (e.g. `<Select {options} />`,
never `<Select.Root>`/`<Select.Option>`), while every internal element stays
reachable for styling via stable **part names** and **variants**. When
components are composed, the model uses a deliberately **shallow, single-level
parent–child nesting**: the child is written explicitly and self-wires to its
parent through a shared context (e.g.
`<TagsInputField><TagsInput/></TagsInputField>`) — far flatter than the deep
nesting typical of compound-component libraries (see
`.ws/policy/compound-components.md`).

Design principles (see `.ref/web-svseeds/src/md/concepts.sv.md`):

- **Standards-first** — prefer semantic/native HTML over JS where it suffices;
  build on native elements when one exists (Disclosure → `details`/`summary`,
  Modal → `dialog`, SelectField → `select`), implement accessibility from
  scratch only when no native element fits.
- **Headless** — no opinionated styles; styling freedom is the default.
- **Library-as-files** — components are usable as an installed package _or_
  copied into a project as `.svelte` source via the external `svseeds-cli`
  tool, for deep customization.

Intended consumers: Svelte 5 application developers.
Non-goals: a themed/design-system component kit; runtime CSS or style presets
shipped by the library; framework support other than Svelte 5.

## System Summary

The system is a **flat collection of independent Svelte components** plus one
shared module — there is no central runtime or app shell.

- Each component lives as a single `.svelte` file under
  `src/lib/_svseeds/` and exposes a flat prop API.
- All components draw shared types, constants, and utilities from
  `_core.ts` (styling resolution, variant/part vocabulary, context helpers,
  field validation types, small DOM/timing utilities).
- Styling flows one way: a component declares a `preset` class and merges it
  with the consumer's `styling` prop via `_fnClass`, emitting classes keyed by
  **part** (`PARTS.*`) and **variant** (`VARIANT.*`). The consumer targets
  those classes from their own CSS.
- Components compose in two ways: a **coordinator** parent shares state with an
  explicitly-written child through a lightweight _optional_ context — so the
  child stays usable standalone — (e.g. Field components over their Input
  counterparts; Accordion over Disclosure), while a few self-contained
  **Composites** privately instantiate a fixed set of children (e.g. Calendar
  over MonthPicker). Either way the intra-library dependency is extracted into
  `dep.json` at build time so the CLI can copy a component together with
  everything it needs. See `.ws/policy/compound-components.md` for the conventions.
- The public package surface (`index.js`/`index.d.ts`) is **generated** from
  the per-component exports by `src/script/prep.ts`; nothing is exported by
  hand.

## Components / Modules

Shared module:

- **`_core.ts`** — shared styling engine (`_fnClass`, `_prepRule`,
  `_ruleClass`), the `BASE`/`VARIANT`/`PARTS` vocabulary, context helpers
  (`_createContext`), field-validation types (`SVSFieldValidation`,
  `SVSFieldConstraint`, `SVSContext`), and utilities (`_omit`, `_debounce`,
  `_throttle`, `shouldReduceMotion`, `canHover`, …).

Components (43 `.svelte` files in `src/lib/_svseeds/`), grouped by role:

- **Field components** (label/validation wrapper around an input; structured
  whole→top/middle/bottom anatomy): TextField, NumberField, CheckField,
  FileField, SelectField, DateField, TagsInputField, ToggleGroupField.
- **Inputs & controls** (the bare interactive control): Button, NumberInput,
  FileInput, DateInput, TagsInput, Toggle, ToggleGroup, Slider, ColorPicker,
  ComboBox, WheelPicker.
- **Overlays & disclosure**: Modal, Drawer, Popover, Tooltip, ContextMenu,
  Disclosure, Accordion.
- **Menu primitives**: MenuList, MenuGroup, MenuItem, MenuSeparator.
- **Date/time pickers**: Calendar, MonthPicker.
- **Navigation & progress**: Tabs, ProgressTracker, Pagination.
- **Layout** (resizable two-pane region): Splitter.
- **Drag & drop**: Sortable, SortableGroup, ZSortableA11y (keyboard-DnD verification copy
  of Sortable).
- **Feedback & utility**: Toast, DarkToggle, HotkeyCapture, Image.

**Composition / dependencies** (source of truth: the generated `dep.json`):

- **Hard dependencies** — one component imports another, so the CLI copies them
  together: Calendar → MonthPicker → WheelPicker; MenuList → MenuSeparator;
  Pagination → ComboBox (Tooltip recurses into itself). Update when an
  intra-library import is added or removed.
- **Coordinator pairings** — no import; the child is written explicitly and
  self-wires to the parent through an optional context, staying usable
  standalone: each Field over its input control, Accordion over Disclosure,
  Pagination over ComboBox.
  These are composition relationships, not packaging dependencies.

## Directory Layout

- `src/lib/_svseeds/` — the library: all component `.svelte` files plus the
  shared `_core.ts`. The single source of truth for what ships.
- `src/script/` — build-time scripts: `prep.ts` generates `src/lib/index.ts`
  from per-component exports and `src/lib/_svseeds/dep.json` from
  intra-component imports; `post.ts` assembles publish metadata and copied
  package assets in `dist/`, then removes the two generated source files after
  the build.
- `src/app.html` — SvelteKit shell (dev/check only; not published).
- `tests/` — Vitest specs: `*.svelte.test.ts` (unit) and `*.svelte.sim.test.ts`
  (browser/interaction simulation), with fixtures.
- `.ws/` — workspace docs (architecture, decisions, knowledge, policy, tasks);
  see `.ws/README.md`.
- `.ref/` — reference material, incl. the canonical concept docs under
  `.ref/web-svseeds/src/md/` (`concepts.sv.md`, `customization.sv.md`,
  `form-controls.sv.md`).

## Public API / Entry Points

Published package `svseeds` (npm; mirrored as `@svseeds/ui` on JSR, which only
redirects users to npm — see the generated `mod.ts`):

- **Package entry** `./index.js` / `./index.d.ts` (generated; field
  `svelte`/`exports` in `package.json`), built from `src/lib/index.ts`
  (generated).
- **Per-component exports** — each component is re-exported under its bare name
  (default export, `_` prefix stripped), alongside its public types, e.g.
  `Button`, `ButtonProps`; `TextField`, `TextFieldValidation`. Type surface
  from `_core.ts` is also re-exported (`SVSClass`, `SVSVariant`, `SVSPart`, …).
  `_`-prefixed symbols (such as per-component `_*_PRESET` values and `_core`
  internals) are treated as library-internal and excluded from the generated
  public surface.
- **Conventional prop API** across components: `styling` (class rules),
  `variant` (drives variant-keyed classes; defaults to `VARIANT.NEUTRAL`),
  `attributes` (passthrough to the main element), `element` (`bind:`),
  `action`, and snippet "parts" (`left`/`right`/…). Composed children are
  configured directly on the explicitly-written child; a Composite's private
  children are configured through per-child namespaced `Omit` bags (e.g.
  Calendar's `monthPicker`). See `.ref/web-svseeds/src/md/customization.sv.md`
  and `.ws/policy/compound-components.md`.
- **Internal subpath imports** (dev/tests only, via `package.json` `imports`):
  `#svs/core` → `_svseeds/_core.ts`, `#svs/*` → `_svseeds/*`.
- **JSR redirect metadata**: `mod.ts` and `jsr.json` are generated into
  `dist/` during build and are no longer committed at the repository root.
- **CLI distribution** (alternate entry point): the external `svseeds-cli`
  copies component `.svelte` files into a consumer's `src/lib/_svseeds/`,
  resolving dependencies via the generated `dep.json`.

## Build / Test / Toolchain

- **Runtime/PM**: Bun. Framework: Svelte 5 (peer `^5.29`) + SvelteKit
  (adapter-auto) + Vite; TypeScript in strict mode.
- **Build**: `bun run build` → `src/script/prep.ts` (regenerate `index.ts` +
  `dep.json`) → `@sveltejs/package` → `src/script/post.ts` (assemble `dist/`
  as the publish directory: cleaned `package.json`, generated `jsr.json` +
  `mod.ts`, copied `_core.ts`, `README.md`, and `LICENSE`; then remove the
  generated `src/lib/index.ts` and `src/lib/_svseeds/dep.json` source files).
  `_core.js` is the unminified output emitted by `@sveltejs/package`; no Terser
  step runs. CI publishes npm and JSR from `dist/`, and release versions are
  single-sourced from the root `package.json`.
- **Test**: `bun run test` (`vitest --run ./tests`); unit specs run under jsdom,
  `*.sim.test.ts` run in a real browser via Playwright/Chromium.
- **Type/lint**: `bun run check` (`svelte-kit sync` + `svelte-check`);
  `bun run fmt` (Prettier + prettier-plugin-svelte).
- Targeted runs: `bunx vitest --run tests/<Component>.svelte.test.ts`.

## Key Decisions

No ADRs recorded under `.ws/decision/` yet. The authoritative rationale for the
current architecture lives in the concept docs:
`.ref/web-svseeds/src/md/concepts.sv.md` (design philosophy / headless /
functionality-vs-styling split), `customization.sv.md` (prop & CLI
customization model), `form-controls.sv.md` (Field anatomy & validation). As
architecture-level choices are made, capture them as ADRs here and link them.
