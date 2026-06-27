# Svelte intrinsic-element `onload`/`onerror` attrs type as a generic `EventHandler`

**Applies to:** svelte ^5.56.3 with `svelte/elements` types, as observed in this
repo (Image.svelte, Button.svelte handler re-dispatch pattern).

## Finding
On intrinsic elements, Svelte's event-handler attributes such as `onload` /
`onerror` are typed as a **generic `EventHandler`** inherited from
`HTMLAttributes`, not as a precise `EventHandler<Event, HTMLImageElement>`. So a
component that wants a precise public prop and a narrowly-typed internal DOM
handler cannot rely on the attribute's own type to carry the element.

## Why it matters / how to apply
When a component captures a native handler and re-dispatches the caller's
callback, keep the **public prop** precisely typed (e.g.
`onerror?: (ev: Event | string) => void`) and apply a **narrow typed cast** at
the internal DOM handler boundary, rather than expecting the element attribute's
inferred type to match. This keeps the caller-facing API exact while satisfying
the DOM-side signature. Reusable for any component wrapping native element events
(load/error and similar).

## References
Surfaced while implementing `Image.svelte`'s load/error re-dispatch; mirrors the
handler re-dispatch idiom already in `Button.svelte`.
