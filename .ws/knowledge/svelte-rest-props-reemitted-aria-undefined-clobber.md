# Svelte rest-props: re-emitted aria attribute needs destructuring to avoid undefined clobber

**Applies to:** Svelte 5; observed in this repo (svelte ^5.x).

## Finding

When a component accepts rest-props **and** computes a merged value for one of those props
(e.g. `aria-labelledby` = context value when embedded, else caller's prop when standalone),
the re-emitted prop must be **destructured out of rest** before spreading.

If the prop stays in `rest` and the component also emits an explicit `aria-labelledby={effValue}`
after `{...rest}`, a `undefined` effective value will override the caller's value that was
already present in the spread.

```svelte
// BAD: ariaLabelledby stays in rest; explicit undefined after spread clobbers it
let { ...rest } = $props();
const eff = $derived(ctx ? ctx.labelId : undefined); // undefined in standalone
// <span {...rest} aria-labelledby={eff}> → eff=undefined erases rest's aria-labelledby
```

```svelte
// GOOD: destructure out the re-emitted prop so it is excluded from the spread
let { "aria-labelledby": ariaLabelledbyProp, ...rest } = $props();
const eff = $derived(ctx ? ctx.labelId : ariaLabelledbyProp);
// <span {...rest} aria-labelledby={eff}> → standalone: caller's value survives
```

## Why it matters / how to apply

Applies to any component that (a) forwards rest-props to a root element and (b) computes a
merged/derived value for one of those props (common for `aria-labelledby`, `aria-describedby`,
`class`). Without destructuring, setting `attr={undefined}` after the spread removes the
attribute entirely, silently erasing any caller-supplied value.

Always destructure props that will be re-emitted with a computed value; spread `{...rest}`
**before** component-owned attrs so remaining rest values cannot override the component's
semantics.

## References

- `TagsInput.svelte` — existing sibling that demonstrates the same pattern for `aria-describedby`
- `ToggleGroup.svelte` — uses the pattern for `aria-labelledby` (C-1/C-2 of task 20260708_byv4bq)
