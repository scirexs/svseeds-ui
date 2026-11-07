# 023. DarkToggle pins color-scheme only on explicit selection

**Status:** Accepted
**Supersedes:** none
**Date:** 2026-11-07
**Affects:** `DarkToggle` public functions (`setTheme`, `toggleTheme`, `setThemeToRoot`) and the `color-scheme` written on `<html>`

## Context

`DarkToggle` wrote `color-scheme: light dark` once at module load. When the selected theme differed from the OS preference, page colors followed the selection while native UI followed the OS. A consumer restores a saved theme on later visits, so the mismatch was lasting. Pages without a selection must still follow the OS, including when the OS preference changes while the page is open. The singleton has no `matchMedia` change listener.

## Decision

`color-scheme` has two states. Until an explicit selection, `<html>` keeps the automatic value detected from stylesheets (`light dark` when both themes exist). A selection writes the concrete theme inline on `<html>`.

`setTheme` always counts as a selection and applies the class, palette, and `color-scheme` even when the theme is unchanged, so a restored choice equal to the OS preference survives a later OS change. The `dark` setter behind mount and prop synchronization keeps its unchanged-theme early return, so mounting a `DarkToggle` whose `dark` equals the current theme does not pin. `setThemeToRoot("light" | "dark")` writes the concrete scheme; `setThemeToRoot()` and custom theme names write the automatic value.

## Consequences

- Native UI matches the selection regardless of the OS preference, and elements with their own `color-scheme` keep winning.
- A selection overrides `color-scheme` declared for `<html>`/`:root` in CSS, including on pages with no detected theme properties.
- A selection stays pinned for the page's lifetime. There is no API to return to OS following.
- `setThemeToRoot` still does not update the singleton or the inline palette, so on a page whose palette comes from `@media` it can select a scheme that differs from the palette.
- A mounted explicit `dark` prop equal to the current theme keeps following the OS until a real change.

## Rejected alternatives

- **Always write the concrete theme, starting at load.** Without a selection, the palette follows `@media` live while `color-scheme` would stay at the load-time value. Avoiding that requires a `matchMedia` listener and new OS-tracking behavior for the singleton.
- **Update `color-scheme` only when the theme changes.** This was the smallest change, but a restored choice equal to the OS preference would keep following the OS, with `isDark()` and the class left stale.
- **Treat every `dark` setter call as a selection.** The setter also runs for mount and prop synchronization, so every mounted `DarkToggle` would pin and pages without a selection would stop following the OS.
- **Leave `color-scheme` to consumers.** Every consumer would need the same workaround for state the library already owns.
