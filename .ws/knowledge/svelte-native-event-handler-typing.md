# Svelte intrinsic-element attrs (`onload`/`onerror`/`oninput`/…) type as a generic handler

**Applies to:** svelte ^5.56.3 with `svelte/elements` types, as observed in this
repo (Image.svelte/Button.svelte handler re-dispatch pattern; ComboBox.svelte
`hinput`/`isComposing`).

## Finding
On intrinsic elements, Svelte's event-handler attributes are typed as a
**generic handler** inherited from `HTMLAttributes` (e.g. `onload`/`onerror` as
generic `EventHandler`, `oninput` as `FormEventHandler`), not as a precise
`EventHandler<InputEvent, HTMLInputElement>` or similar. So a component that
wants a narrowly-typed internal handler — e.g. one that reads
`InputEvent.isComposing` directly — cannot rely on the attribute's own type to
carry that precision, in either direction: neither re-dispatching a caller
callback nor assigning the handler straight to the attribute typechecks without
a cast at the seam.

## Why it matters / how to apply
Keep the **internal handler** (and, when re-dispatching, the public prop)
precisely typed — e.g. `const hinput: EventHandler<InputEvent,
HTMLInputElement> = (ev) => { if (ev.isComposing) return; … }` so `isComposing`
is read directly, no cast needed inside the handler body. Then apply a **cast at
the boundary** where the narrow type meets the generic attribute type:
- Re-dispatch pattern (e.g. `Image.svelte` load/error): narrow-cast the
  *internal DOM handler* argument down to the precise type.
- Direct-assignment pattern (e.g. `ComboBox.svelte` `oninput`): cast the
  *handler itself* up to the attribute's generic type at the JSX-attribute
  assignment, e.g. `oninput={hinput as FormEventHandler<HTMLInputElement>}`.

Either way, do not expect the element attribute's inferred type to match a
precise handler type on its own — always land the cast at the single seam
between the narrow internal type and the generic attribute type. Reusable for
any component wrapping or directly assigning a native element event where
composition-safe (`isComposing`) or otherwise precise event access is needed.

## References
Surfaced while implementing `Image.svelte`'s load/error re-dispatch (mirrors the
handler re-dispatch idiom in `Button.svelte`); confirmed again while unifying
`ComboBox.svelte`'s `isComposing` access (task 20260709_bfinc7).
