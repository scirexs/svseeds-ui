# A Svelte transition directive wrapper can widen params beyond the wrapped function's own type

**Applies to:** Svelte `svelte/transition` (`crossfade` and similar factory transitions), svelte@5.x, as observed in this repo (`Sortable.svelte` `SortableController.send`/`receive`).

## Finding

A component-owned transition function assigned to `in:`/`out:` only needs to be
call-site compatible with Svelte's transition-directive signature
(`(node, params) => () => TransitionConfig`); it does not need to share the
exact parameter type of the library function it wraps. You can type the public
wrapper's parameter as a superset (e.g. `CrossfadeParams & { key: PropertyKey;
memberId?: string }`) while the constructor still stores and delegates to the
raw `crossfade()`-returned function typed with the library's own narrower
parameter type. The wrapper closure reads the extra fields itself and forwards
the (structurally still-compatible) object to the raw function.

## Why it matters / how to apply

This lets a component thread extra per-call data (like which list a keyed node
belongs to) through the same `in:controller.receive={{ key, memberId }}` /
`out:controller.send={{ key, memberId }}` directive call, without expanding the
public controller surface with a new method or changing the raw crossfade
function's own type. Keep two type aliases: one for the raw library function
type (used for the constructor parameter / internal delegate), and one for the
wrapper's own directive-facing type (the superset, used for the public field).
Only the wrapper needs to inspect the extra fields before delegating or
short-circuiting (e.g. returning an inert `{ duration: 0 }` transition).

## References

- `src/lib/_svseeds/Sortable.svelte` — `RawTransitionFn` vs `TransitionFn`/`SortableTransitionParams`, `SortableController.send`/`receive` wrapping the constructor's raw `crossfade()` functions.
- task 20260714_jyqtkv
