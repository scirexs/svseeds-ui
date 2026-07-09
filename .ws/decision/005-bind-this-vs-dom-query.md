# 005. bind:this for owned elements, DOM queries for delegation/slotted/global-focus

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-09
**Affects:** Calendar, DateInput, MenuList, Sortable, ZSortableA11y (and `document.activeElement` reads in ContextMenu, HotkeyCapture, NumberInput)

## Context
Components across the library locate DOM nodes in several distinct ways. Some
lookups target elements the component itself renders; others target arbitrary
event targets, caller-slotted children, global focus state, or nodes owned by
sibling instances / child components. A blanket "replace every `querySelector`
with `bind:this`" was proposed for maintainability and runtime safety, but the
lookups are not all the same kind of thing.

## Decision
Use `bind:this` for elements a component **owns and renders**. Keep standard DOM
queries where `bind:this` has no equivalent:
- **Event delegation** — `Element.closest()` walking up from `ev.target`
  (Sortable / ZSortableA11y pointer & keyboard handlers); the target is arbitrary,
  so there is nothing to bind.
- **Caller-slotted descendants** — `element.querySelectorAll('[role="menuitem"]')`
  in MenuList; the items are provided by the caller (or nested one level down in a
  MenuGroup), not rendered by MenuList in an `#each`. The **descendant** query is
  required so MenuGroup-nested items are included.
- **Global focus state** — `document.activeElement` (MenuList, ContextMenu,
  HotkeyCapture, NumberInput, DateInput); no framework equivalent.
- **Cross-instance / cross-child coordination** — ZSortableA11y `focusItem` spans
  sibling list instances through the shared controller; DateInput `focusCalendar`
  reaches the child Calendar's active cell (scoped to the bound overlay element
  rather than a document-wide selector).

Queries that remain use `data-*` attribute selectors, never part-name classes:
object-form `styling` emits no part class, so class selectors return null (see
knowledge `svseeds-object-styling-no-part-literal-class.md`).

## Consequences
`bind:this`-backed lookups are type-safe and independent of DOM attribute
contracts. The remaining queries are intentional and documented; contributors
should not "finish" the refactor by forcing `bind:this` onto the delegation,
slotted, global-focus, or cross-instance/child cases. Eliminating the
cross-instance/child queries later would require new cross-component contracts —
an element registry on the shared Sortable controller and a focus API on Calendar
— which are deliberately deferred.

## Rejected alternatives
- **Replace every `querySelector` with `bind:this`.** Impossible or harmful for
  event delegation (arbitrary target), caller-slotted children (not rendered by
  the component), global focus, and cross-instance/child nodes; it would demand
  new cross-component contracts with broad blast radius, exceeding the task intent.
- **Scope MenuList's `menuItems()` to direct children (`:scope >`).** Breaks
  MenuGroup, whose items are nested one level down; the flat descendant query is
  correct because the library has no nested/submenu MenuList.
- **Keep DateInput `focusCalendar`'s document-wide selector.** Needlessly global;
  the overlay element is already bound, so scoping to it drops the `document` and
  `uid` dependency while preserving behavior.
