<!--
  @component
  default value: `(value)`
  ```ts
  interface SliderProps {
    range: Range; // bindable
    left?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    value?: number; // bindable (min+((max-min)/2))
    step?: number | "any"; // (1)
    options?: SvelteSet<number> | Set<number>;
    background?: Range; // ({ min: 5, max: 95 }); linear-gradient rate limit of slider's track
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  type Range = { min: number, max: number };
  ```
-->
<script module lang="ts">
  export interface SliderProps {
    range: Range; // bindable
    left?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    value?: number; // bindable (min+((max-min)/2))
    step?: number | "any"; // (1)
    options?: SvelteSet<number> | Set<number>;
    background?: Range; // ({ min: 5, max: 95 }); linear-gradient rate limit of slider's track
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
  }
  export type SliderReqdProps = "min" | "max";
  export type SliderBindProps = "min" | "max" | "value" | "variant" | "element";
  export type Range = { min: number, max: number };

  const preset = "svs-slider";

  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, VARIANT, PARTS, elemId, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { range = $bindable(), left, right, value = $bindable(), step = 1, options, background = { min: 5, max: 95 }, attributes, action, element = $bindable(), styling, variant = $bindable("") }: SliderProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  const cls = fnClass(preset, styling);
  const idList = elemId.get(options?.size);
  const attrs = omit(attributes, "class", "type", "value", "min", "max", "step", "list");
  if (range.min > range.max) range = { min: range.max, max: range.min };
  if (background.min > background.max) background = { min: background.max, max: background.min };
  if (value === undefined || value < range.min || value > range.max) value = range.min + ((range.max - range.min) / 2);

  // *** Bind Handlers *** //
  let rate = $derived(Math.trunc(background.min + ((value - range.min) / (range.max - range.min)) * (background.max - background.min)));
  let dynStyle = $derived(`background: linear-gradient(to right, var(--color-active) ${rate}%, var(--color-inactive) ${rate}%);`);
</script>

<!---------------------------------------->

<span class={cls(PARTS.WHOLE, variant)}>
  {@render side(PARTS.LEFT, left)}
  {#if action}
    <input bind:value bind:this={element} class={cls(PARTS.MAIN, variant)} style={dynStyle} list={idList} type="range" min={range.min} max={range.max} {step} {...attrs} use:action />
  {:else}
    <input bind:value bind:this={element} class={cls(PARTS.MAIN, variant)} style={dynStyle} list={idList} type="range" min={range.min} max={range.max} {step} {...attrs} />
  {/if}
  {#if options?.size}
    <datalist id={idList}>
      {#each options as option}
        <option value={option}></option>
      {/each}
    </datalist>
  {/if}
  {@render side(PARTS.RIGHT, right)}
</span>

{#snippet side(area: string, body?: Snippet<[number, string, HTMLInputElement | undefined]>)}
  {#if body}
    <span class={cls(area, variant)}>{@render body(value!, variant, element)}</span>
  {/if}
{/snippet}
