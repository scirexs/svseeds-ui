# Compound & Context Component Conventions

How to build components that wrap or coordinate other svseeds components — the project's
compound / context pattern reference, linked from `coding-style.md` §15 and used when
authoring change requests (`design` / `analyze`) for compound components.

## 1. Pattern selection
Three patterns. The discriminator: **does the caller write or supply the composed child?**
If no, it is *Composite*. If yes, it is *Flat pass-through* (a thin 1:1 decorator) or
*Context coordinator* (1..N children sharing state).

- **Flat pass-through** — a thin 1:1 decorator that renames/controls one or two props and
  forwards the rest. No context. Declare `interface XProps extends Omit<ChildProps, <controlled>>
  { ...own }` and render `<Child {...rest} bind:... />`. Do NOT make the base child context-aware.
  (e.g. DarkToggle over Toggle)
- **Context coordinator** — a parent that wires 1..N children through a lightweight shared-state
  context the child consumes optionally. Cardinality (single control vs many peers) is NOT a
  separate pattern. Two responsibilities recur, differing in role, not mechanism:
  - *Field* — decorates and validates a single control with the standard form chrome
    (label/extra/aux/left/right/bottom anatomy, the `variant` state machine, constraints/
    validations, aria + hidden inputs). (e.g. TagsInputField, ToggleGroupField)
  - *Interaction coordinator* — shares interaction state across peers via a single key such as
    `current`; children self-wire by an addressing key (`id`). (e.g. Accordion over Disclosure)

  Both use the same optional context and both keep the child usable standalone.
- **Composite** — a self-contained widget that internally instantiates a *fixed* set of svseeds
  children as **private implementation details** (not caller-written, not extensible). The parent
  owns value/variant/styling and the coordination logic and forwards them to the children via
  props. Per-child presentational/behavioural config is exposed through **one namespaced `Omit`
  bag per child role** (`year`, `month`, `monthPicker`), Omitting parent-controlled props
  (value/min/max/variant). **No context** — the children are never caller-facing, so there is
  nothing to reconcile between standalone and embedded use. Use only when the child's structural
  role is fixed; if the caller should be able to swap or extend children, use a context
  coordinator instead. (e.g. MonthPicker over two WheelPickers, Calendar over MonthPicker)

### Out of scope
Components that do not wrap another svseeds component's props or state are not governed here —
e.g. imperative self-portals via `mount()` (Tooltip). These are not compound components.

## 2. Passing props to children
The child is **always written explicitly** by the caller; a context coordinator never re-exposes
child props on its own flat namespace. This section governs the two coordination patterns;
*Composite* children are private — they only follow the namespaced-bag rule (§2, "Configure
generated child via one namespaced bag"), never flat re-exposure, and never the context wiring.

- **Wiring flows through context, not props.** `variant`, `styling`, `id`, validation, `current`,
  events, etc. are carried by the context object, so an explicitly-written child self-wires with
  no forwarding. The parent owns these; the child's own same-named props are ignored when embedded.
- **Child-specific config goes on the child.** Presentational/behavioural props the parent does
  not own (`separator`, `paste`, …) — including the motion/CSS-bridge surfaces `cssvar`,
  `duration`/`motion`, and `transition` (`coding-style.md` §13) — are set directly on the child element. Do NOT
  lift them onto the parent interface. Context wiring carries `variant`/`styling`/validation; these
  motion props are not part of the context, so a coordinator forwards them only through the child
  the caller already writes.
- **No flat forwarding.** Never spread selected child props onto the parent (the old flat
  `separator`/`paste`/`options`/`multiple` on a field). It is partial, collision-prone with the
  parent's own props, and silently no-ops once the caller supplies the child.
- **Array sugar — genuine 1:N only.** Where hand-writing N children for array-shaped data is
  painful, an interaction coordinator MAY add a data entry point (`items`) that renders default
  children into the same context. Reserve this for true 1:N; do NOT add it to single-control
  Fields (write the one child explicitly). When both data and `children` are supplied,
  `children` wins (no merge).
- **Configure the generated child via one namespaced bag.** In array-sugar mode the default child
  is configured through a single prop typed `child?: Omit<ChildProps, <Reqd | Bind | controlled>>`
  (e.g. Accordion's `disclosure`). Borrow the child's type via `Omit`; never enumerate or flatten.
  Props the context owns are `Omit`-ted out. Motion/CSS-bridge props (`cssvar`, `duration`/`motion`,
  `transition`) belonging to a generated or Composite child travel **inside that child's namespaced
  bag** (e.g. Calendar's `monthPicker`, Accordion's `disclosure`), never as flat props on the
  parent — they follow the same `Omit` rule as the rest of the child's surface.

## 3. Optional context: helper & types
- Use `_createContext<T>()` from `./_core` (NOT svelte's). Its getter returns `T | undefined`, so
  standalone usage is detected without throwing.
- Define the context contract in the **base/child** component's `<script module>` and export
  `[_getXContext, _setXContext]`. The parent imports the setter from the base, keeping the
  dependency direction parent → base.
- Type hierarchy: `SVSContext` (`variant`, `styling`) for any context; `SVSFieldContext extends
  SVSContext` (adds `ariaErrMsgId`, `id`, `describedby`, `onchange`, `oninvalid`) for field
  components. The concrete interface adds the value shape (`values`/`value`/`open`/…), `events`,
  and `element(s)`.
- Member kinds: getters for read-only/derived state; get+set for two-way bindables; set-only for
  child→parent element refs; plain props for stable composed handlers.

## 4. Consuming context in the child (dual mode)
- Read once at init: `const ctx = _getXContext();`. `undefined` ⇒ standalone (behaviour
  unchanged); set ⇒ embedded.
- Per controlled prop: `const effX = $derived(ctx ? ctx.x : x)` for reads, and route writes
  through `setX(v) { if (ctx) ctx.x = v; else x = v; }`.
- The child's own same-named props are ignored when embedded; presentational props stay
  caller-controlled.

## 5. Declaration ordering
Any reactive value (e.g. a `$derived` id) read by a context object's getters MUST be declared
before the context object literal. Getters are lazy, but forward references are fragile.

## 6. Handler composition
Collection events (`onadd`/`onremove`, type `CollectionEvents<T>` from `./_core`) are
**allow-list veto** hooks: the handler is given `{ values, added }` / `{ values, removed }`
(`values` = current set; `added`/`removed` = built-in-valid candidates) and returns the
subset to **commit** (set E). `undefined`/no return ⇒ commit all (safe default, so pure
observers never block); `[]` ⇒ commit none; a subset ⇒ only those. Return type is
`T[] | void` — never a boolean.
When both caller (`events`) and parent (`ctx.events`) supply a handler, compose by
**intersection** (an item proceeds only if every handler allows it): apply **caller first,
parent second** (order matters only for side effects; intersection is commutative), each
as a truthy-guarded filter — `if (r) keep = keep.filter((x) => r.includes(x))` — which works
because `[]` is truthy (⇒ keep none) while `undefined`/void is falsy (⇒ identity, no filter).
Keep this inline (≈4 lines); do not add a shared compose helper.
The return value is a **multiset**: multiplicity caps how many matching candidates proceed
(`["x"]` ≠ `["x","x"]`). For element types that cannot guarantee uniqueness (e.g. bare
strings under `unique:false`), matching is **best-effort by count consumption** and which
specific duplicate instances proceed is component-defined; callers needing exact
instance control should use an identity-bearing element type (e.g. `File`).

## 7. Element mirroring
Mirror the child element(s) into the context via an effect: single `set element`
(`$effect(() => { if (ctx) ctx.element = element; })`) or `set elements` for array-valued children.

## 8. Function bindings
Use `bind:value={() => effX, (v) => setX(v)}` to keep one template across both modes. Requires
svelte `^5.9` (within the current peer range).

## 9. Tests
Add `tests/fixtures/<Child>CtxProvider.svelte` that sets a controllable `$state`-backed context
and renders the child (since `setContext` needs an ancestor component). Existing standalone tests
must stay unchanged; add an embedded group asserting ctx-sourced state and write-back.
