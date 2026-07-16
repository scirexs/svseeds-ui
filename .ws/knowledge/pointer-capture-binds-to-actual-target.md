# Implicit pointer capture binds to the actual event target, not an ancestor

**Applies to:** Touch browsers (e.g. iOS Safari) that implicitly capture the pointer on `pointerdown`.

## Finding
When a touch browser implicitly captures the pointer on `pointerdown`, the capture is bound to the actual event target (`ev.target`), not to any ancestor. Calling `releasePointerCapture()` on an ancestor (e.g. a containing `<li>`) does not release capture held by a nested descendant that was the real touch target, so boundary events like `pointerover`/`pointerenter` stay suppressed for elements under the finger.

## Why it matters / how to apply
For pointer-based hit-testing (e.g. drag-and-drop reordering) that relies on `pointerover`/`pointerenter` after a drag starts, release capture from `ev.target` itself when it is an `Element`, not from a derived ancestor/identity element found for other purposes (e.g. item-key lookup). Wrap the release in try/catch — some targets never hold capture, and browsers can throw.

## References
Found while fixing `Sortable.svelte`'s touch-drag reorder failure on iOS Safari: the previous code released capture from the containing `<li data-svs-key>`, which worked only when that `<li>` was itself the touch target, not when the target was a nested child or an attached handle element.
