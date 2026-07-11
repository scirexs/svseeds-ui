# 010. Sortable announcements are customized via a `SortableMessages` formatter-function object

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-07-11
**Affects:** `Sortable` / `SortableGroup` public prop surface (`messages`), the `createSortableGroup` factory signature, and the new exported `SortableMessages` type

## Context

Sortable announces keyboard drag-and-drop and multi-select actions through an
`aria-live="polite"` SR-only region. The wording was hard-coded English built at
seven call sites (five in the group controller, two in the component's selection
toggle). Consumers need to localize or reword these announcements. Each message
interpolates a small set of runtime values — an item key, a 1-based position, a
total, or a selection count — so the customization surface must carry those
values to the consumer, not just accept a static string. How to shape that
surface was the open choice.

## Decision

Introduce an exported `SortableMessages` interface: one formatter function per
announcement, each receiving the values it needs (`grabbed(key, index, total)`,
`atPosition(index, total)`, `moved`, `dropped`, `cancelled`,
`selected(key, count)`, `deselected(key, count)`; `index` is 1-based). A
module-level default provides the existing English wording. Consumers pass a
`Partial<SortableMessages>` that is merged over the default
(`{ ...defaults, ...messages }`), so any subset can be overridden and unspecified
formatters keep the English default.

The resolved message set lives on the group controller (`SortableGroupController.messages`),
because five of the seven announcements originate there. It is configured through
`createSortableGroup(presentation, motion, messages?)` (a third optional
argument) and surfaced as a `messages` prop on both `Sortable` and `SortableGroup`,
which forward it into the controller they create. When an external `group`
controller or a `SortableGroup` context is in effect, that controller's own
messages win and a local `messages` prop is ignored — identical to how
`presentation`/`motion` precedence already works.

## Consequences

- Announcements are fully localizable/customizable, with the runtime values
  exposed to the consumer's formatter and type-checked against `SortableMessages`.
- Partial override plus default merge means a consumer overrides only the strings
  they care about; omitting `messages` reproduces the prior wording byte-for-byte.
- One config surface (the controller) feeds both the keyboard and selection
  announcements, so there is no second place to configure.
- The prop/argument shape is now public API; changing the formatter signatures or
  the merge semantics later would be a breaking change.
- The precedence rule (external controller's messages win over a local prop) is a
  documented behavior reviewers should preserve, not "fix".

## Rejected alternatives

- **Template strings with placeholders** (e.g. `"{key} at {index}/{total}"`).
  Simpler to type, but cannot type-check the available placeholders, handles
  plural/positional grammar poorly, and pushes string-templating into the
  component. Formatter functions keep grammar in the consumer's hands and are
  type-safe.
- **A single `announce(type, params)` override callback.** Flexible, but forces
  every consumer to switch over all message types and makes per-message fallback
  to the English default awkward; the per-message object with partial merge gives
  clean, incremental overrides.
- **Configure messages only on `createSortableGroup`.** Minimal API, but standalone
  and `SortableGroup`-context consumers never call the factory, leaving them no way
  to customize. Component props on both `Sortable` and `SortableGroup` cover every
  usage form.
