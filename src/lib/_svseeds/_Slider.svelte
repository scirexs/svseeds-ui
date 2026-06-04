<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface SliderProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "list"> {
    min: number;
    max: number;
    left?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    value?: number; // bindable (min+((max-min)/2))
    step?: number | "any"; // (1)
    options?: SvelteSet<number> | Set<number>;
    background?: Range; // ({ min: 5, max: 95 }); linear-gradient rate limit of slider's track
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    // class & other HTMLInputAttributes are passed to <input> via ...rest (class is merged onto the control)
  }
  type Range = { min: number, max: number };
  ```
  ### Anatomy
  ```svelte
  <span class="whole">
    <span class="left">{left}</span>
    <input class={["main", class]} type="range" {min} {max} {...rest} bind:value bind:this={element} {@attach attach} />
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
  export interface SliderProps extends Omit<HTMLInputAttributes, "type" | "value" | "min" | "max" | "list"> {
    min: number;
    max: number;
    left?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    right?: Snippet<[number, string, HTMLInputElement | undefined]>; // Snippet<[value,variant,element]>
    value?: number; // bindable (min+((max-min)/2))
    options?: SvelteSet<number> | Set<number>;
    background?: Range; // ({ min: 5, max: 95 }); linear-gradient rate limit of slider's track
    attach?: Attachment;
    element?: HTMLInputElement; // bindable
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type SliderReqdProps = "min" | "max";
  export type SliderBindProps = "value" | "element";
  export type Range = { min: number; max: number };

  const preset = "svs-slider";

  import { type Snippet } from "svelte";
  import { type Attachment } from "svelte/attachments";
  import { type SvelteSet } from "svelte/reactivity";
  import { type HTMLInputAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { min, max, left, right, value = $bindable(), options, background = { min: 5, max: 95 }, attach, element = $bindable(), styling, variant = VARIANT.NEUTRAL, class: c, ...rest }: SliderProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const uid = $props.id();
  const idList = $derived(options?.size ? `${uid}-list` : undefined);
  const rmin = $derived(min > max ? max : min);
  const rmax = $derived(min > max ? min : max);
  const bg = $derived(background.min > background.max ? { min: background.max, max: background.min } : background);
  // svelte-ignore state_referenced_locally
  if (value === undefined || value < rmin || value > rmax) value = rmin + (rmax - rmin) / 2;

  // *** Bind Handlers *** //
  const rate = $derived(Math.trunc(bg.min + ((value - rmin) / (rmax - rmin)) * (bg.max - bg.min)));
  const style = $derived(`background: linear-gradient(to right, var(--color-active) ${rate}%, var(--color-inactive) ${rate}%);`);
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
