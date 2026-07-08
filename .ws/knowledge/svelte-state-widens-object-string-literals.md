# `$state()` widens string-literal object properties to `string`

**Applies to:** Svelte 5 with TypeScript; observed in this repo as of svelte `^5.x`, typescript `^5.x`.

## Finding

When `$state()` is initialized with an object literal that contains string-literal
values, TypeScript widens those literals to `string`. For example:

```ts
const props = $state({ spin: "split" })
// inferred as { spin: string }, not { spin: "none" | "split" | "stack" }
```

Passing `props` to a typed component whose prop is `"none" | "split" | "stack"`
produces a type error even though the runtime value is correct.

## Why it matters / how to apply

Test setups that drive reactive prop objects via `$state` must annotate the type
explicitly to preserve string-literal narrowing:

```ts
const props = $state<NumberInputProps>({ spin: "split" })
// or narrow the specific field
const props: { spin: NumberInputProps["spin"] } = $state({ spin: "split" })
```

Without the annotation the inferred type is too wide for the component's prop union.

## References

`feedback-implementer.md` of task 20260708_d4d7g4; related: [[svelte-state-prop-initializer-warning]].
