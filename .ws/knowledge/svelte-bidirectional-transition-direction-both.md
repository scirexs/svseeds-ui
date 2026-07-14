# Svelte bidirectional `transition:` always passes `direction: "both"`

**Applies to:** Svelte 5 (keyed block / `{#key}` re-mount transitions). Observed in this repo as of the `svseeds-ui` Calendar component, commit context around ADR-014.

## Finding

A single bidirectional `transition:fn|local={params}` on a keyed element passes `direction: "both"` to the transition function for **both** the entering and the leaving instance — never `"in"` or `"out"`. There is no way for `fn` to distinguish enter from leave through this directive form, even though the `direction` parameter type may suggest `"in" | "out" | "both"` are all live outcomes.

## Why it matters / how to apply

Any pattern that needs to treat the entering and leaving elements differently (e.g. overlay only the leaving element with `position: absolute` while the entering element stays in-flow to preserve container height) cannot work with a single `transition:` directive — both elements get identical `direction: "both"` treatment, so an overlay-style caller ends up overlaying both, collapsing the in-flow height to `0`.

Fix: split into two directives that share the same function and params — `in:fn|local={params}` and `out:fn|local={params}` — instead of one `transition:fn|local={params}`. Svelte then delivers `direction: "in"` to the entering element and `direction: "out"` to the leaving element. Only use bidirectional `transition:` when both directions are meant to be treated identically (e.g. a simple mount/unmount fade with no enter/leave-specific layout logic).

## References

`.ws/decision/014-calendar-page-slide-split-directives.md` (supersedes `011-calendar-page-transition.md`) — Calendar's `pageTransition` overlay slide was invisible until `.main`'s grid transition was split from `transition:` into `in:`/`out:`.
