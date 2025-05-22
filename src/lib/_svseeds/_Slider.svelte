<!--
  @component
  default value: `<value>`
  ```ts
  interface SliderProps {
    range: Range; // bindable
    left?: Snippet<[string, number, HTMLInputElement | undefined]>; // Snippet<[status,value,element]>
    right?: Snippet<[string, number, HTMLInputElement | undefined]>; // Snippet<[status,value,element]>
    value?: number; // bindable <min+((max-min)/2)>
    step?: number | "any"; // <1>
    options?: SvelteSet<number> | Set<number>;
    background?: Range; // <{ min: 5, max: 95 }>
    status?: string; // bindable <STATE.DEFAULT>
    style?: SVSStyle;
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
  }
  type Range = { min: number, max: number };
  ```
-->
<script module lang="ts">
  export interface SliderProps {
    range: Range; // bindable
    left?: Snippet<[string, number, HTMLInputElement | undefined]>; // Snippet<[status,value,element]>
    right?: Snippet<[string, number, HTMLInputElement | undefined]>; // Snippet<[status,value,element]>
    value?: number; // bindable <min+((max-min)/2)>
    step?: number | "any"; // <1>
    options?: SvelteSet<number> | Set<number>;
    background?: Range; // <{ min: 5, max: 95 }>
    status?: string; // bindable <STATE.DEFAULT>
    style?: SVSStyle;
    attributes?: HTMLInputAttributes;
    action?: Action;
    element?: HTMLInputElement; // bindable
  }
  export type SliderReqdProps = "min" | "max";
  export type SliderBindProps = "min" | "max" | "value" | "status" | "element";
  export type Range = { min: number, max: number };

  const preset = "svs-slider";

  import { type Snippet } from "svelte";
  import { type Action } from "svelte/action";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSStyle, STATE, PARTS, elemId, fnClass, omit } from "./core";
</script>

<script lang="ts">
  let { range = $bindable(), left, right, value = $bindable(), step = 1, options, background = { min: 5, max: 95 }, status = $bindable(""), style, attributes, action, element = $bindable()}: SliderProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const idList = elemId.get(options?.size);
  const attrs = omit(attributes, "class", "type", "value", "min", "max", "step", "list");
  if (range.min > range.max) range = { min: range.max, max: range.min };
  if (value === undefined || value < range.min || value > range.max) value = range.min + ((range.max - range.min) / 2);

  // *** Bind Handlers *** //
  let rate = $derived(Math.trunc(background.min + ((value - range.min) / (range.max - range.min)) * (background.max - background.min)));
  let dynStyle = $derived(`background:linear-gradient(to right, var(--color-active) ${rate}%, var(--color-inactive) ${rate}%);`);
</script>

<!---------------------------------------->

<span class={cls(PARTS.WHOLE, status)}>
  {@render side(PARTS.LEFT, left)}
  {#if action}
    <input bind:value bind:this={element} class={cls(PARTS.MAIN, status)} style={dynStyle} list={idList} type="range" min={range.min} max={range.max} {step} {...attrs} use:action />
  {:else}
    <input bind:value bind:this={element} class={cls(PARTS.MAIN, status)} style={dynStyle} list={idList} type="range" min={range.min} max={range.max} {step} {...attrs} />
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

{#snippet side(area: string, body?: Snippet<[string, number, HTMLInputElement | undefined]>)}
  {#if body}
    <span class={cls(area, status)}>{@render body(status, value!, element)}</span>
  {/if}
{/snippet}
