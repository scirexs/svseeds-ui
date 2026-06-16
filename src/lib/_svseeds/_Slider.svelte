<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface SliderProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "list" | "style"> {
    min: number;
    max: number;
    left?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    value?: number; // bindable (min+((max-min)/2))
    step?: number | "any"; // (1)
    options?: SvelteSet<number> | Set<number>;
    fillRange?: Range; // ({ min: 5, max: 95 }); linear-gradient rate limit of slider's track
    cssvar?: Partial<Record<SliderCssVar, string>>;
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
    // style is component-owned (omitted)
  }
  type Range = { min: number, max: number };
  type SliderCssVar = "active" | "inactive"; // cssvar values are full --names the gradient reads; default --color-active / --color-inactive
  ```
  ### Anatomy
  ```svelte
  <span class="whole">
    <span class="left">{left}</span>
    <input class="main" {...rest} type="range" {min} {max} />
    <datalist conditional>
      {#each options as option}
        <option value={option}></option>
      {/each}
    </datalist>
    <span class="right" conditional>{right}</span>
  </span>
  ```
-->
<script module lang="ts">
  export interface SliderProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "list" | "style"> {
    min: number;
    max: number;
    left?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    value?: number; // bindable (min+((max-min)/2))
    options?: SvelteSet<number> | Set<number>;
    fillRange?: Range; // ({ min: 5, max: 95 }); linear-gradient rate limit of slider's track
    cssvar?: Partial<Record<SliderCssVar, string>>; // custom-property names the track gradient reads; absent key uses default name
    attach?: Attachment<HTMLInputElement>;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // style is component-owned (omitted)
  }
  export type SliderReqdProps = "min" | "max";
  export type SliderBindProps = "value" | "element";
  export type Range = { min: number; max: number };
  export type SliderCssVar = "active" | "inactive";

  export const _SLIDER_PRESET = "svs-slider";

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { min, max, left, right, value = $bindable(), options, fillRange = { min: 5, max: 95 }, cssvar, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: SliderProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_SLIDER_PRESET, styling));
  const uid = $props.id();
  const idList = $derived(options?.size ? `${uid}-list` : undefined);
  const rmin = $derived(min > max ? max : min);
  const rmax = $derived(min > max ? min : max);
  const span = $derived(rmax - rmin);
  const bg = $derived(fillRange.min > fillRange.max ? { min: fillRange.max, max: fillRange.min } : fillRange);
  const clamp = (v: number) => Math.min(Math.max(v, rmin), rmax);
  // svelte-ignore state_referenced_locally
  if (value === undefined) value = rmin + span / 2;
  // svelte-ignore state_referenced_locally
  else if (value < rmin || value > rmax) value = clamp(value);

  // *** Reactive Handlers *** //
  const rate = $derived(
    span === 0 ? Math.trunc(bg.min + (bg.max - bg.min) / 2) : Math.trunc(bg.min + ((value - rmin) / span) * (bg.max - bg.min)),
  );
  const activeVar = $derived(cssvar?.active ?? "--color-active");
  const inactiveVar = $derived(cssvar?.inactive ?? "--color-inactive");
  const style = $derived(`background: linear-gradient(to right, var(${activeVar}) ${rate}%, var(${inactiveVar}) ${rate}%);`);

  $effect.pre(() => {
    if (value !== undefined && (value < rmin || value > rmax)) value = clamp(value);
  });
</script>

<!---------------------------------------->

<span class={cls(PARTS.WHOLE, variant)}>
  {@render side(PARTS.LEFT, left)}
  <input
    bind:value
    bind:this={element}
    class={[cls(PARTS.MAIN, variant), c]}
    {...rest}
    {style}
    list={idList}
    type="range"
    min={rmin}
    max={rmax}
    {@attach attach}
  />
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
