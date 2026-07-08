# Object-form `styling` does not emit literal part-name classes

**Applies to:** `src/lib/_svseeds/_core.ts` — `_ruleClass` / `_fnClass`; observed in this repo as of commit deb76a4.

## Finding

When `styling` is passed as an **object** (per-part class map), `_ruleClass()` emits only the user's supplied classes — it does **not** append the literal part-name token (e.g. `label`, `middle`). Preset-string mode (`_fnClass`) always appends the part literal as well. Component internals that query by the literal class (e.g. `querySelector('.label')`) return `null` in object mode, silently breaking any logic that depends on the found element.

## Why it matters / how to apply

Any DOM lookup inside a component that relies on a part-name literal class is broken for consumers who pass `styling` as an object. Use `bind:this` references (or structural selectors) instead of class-based `querySelector` calls to reach component elements — those are robust in both modes.

## References

- `_core.ts`: `_ruleClass` (object mode) vs `_fnClass` (string/preset mode).
- Root cause of WheelPicker `itemH = 0` collapse in object-styling mode (task 20260708_dqekeu).
