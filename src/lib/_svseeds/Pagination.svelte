<!--
  @component
  ### Usage
  Use as a coordinator around `ComboBox`.
  ```svelte
  <Pagination comboBox={{ placeholder: "Page" }} />

  <Pagination>
    <ComboBox />
  </Pagination>
  ```
  ### Types
  default value: *`(value)`*
  ```ts
  interface PaginationProps {
    children?: Snippet<[number, string]>; // Snippet<[value,variant]>
    value?: number; // bindable; current page (default 1)
    min?: number; // first page (default 1)
    max?: number; // last page (default = max(min, value))
    options?: number[]; // shortcut list shown in the ComboBox
    top?: Snippet<[number, string]>; // Snippet<[value,variant]>; FIRST button content
    left?: Snippet<[number, string]>; // Snippet<[value,variant]>; PREV button content
    right?: Snippet<[number, string]>; // Snippet<[value,variant]>; NEXT button content
    bottom?: Snippet<[number, string]>; // Snippet<[value,variant]>; LAST button content
    ariaLabel?: string; // ("Pagination")
    ariaTopLabel?: string; // ("First page")
    ariaLeftLabel?: string; // ("Previous page")
    ariaRightLabel?: string; // ("Next page")
    ariaBottomLabel?: string; // ("Last page")
    comboBox?: Omit<ComboBoxProps, ComboBoxReqdProps | ComboBoxBindProps | "options" | "variant" | "styling">;
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  ```
  ### Anatomy
  ```svelte
  <nav class="whole" aria-label>
    <button class="top" type="button" aria-label aria-disabled>{top}</button>
    <button class="left" type="button" aria-label aria-disabled>{left}</button>
    {#if children}{children}{:else}<ComboBox />{/if}
    <button class="right" type="button" aria-label aria-disabled>{right}</button>
    <button class="bottom" type="button" aria-label aria-disabled>{bottom}</button>
  </nav>
  ```
  ### Behavior
  - The page commits on ComboBox blur, Enter, and option select; invalid input reverts and out-of-range input clamps.
  - Buttons use `aria-disabled`, stay focusable at bounds, and suppress their action while at-bound.
  - Part names map by position: TOP=first, LEFT=prev, RIGHT=next, BOTTOM=last.
  - Embedded `ComboBox` is wired through context; `comboBox` is ignored when `children` is supplied.
  - The default shortcut list is centered on the current page. A caller-provided `options` list can follow the page with `bind:value={page}` and `const opts = $derived(...)`; no change event is needed.
-->
<script module lang="ts">
  export interface PaginationProps {
    children?: Snippet<[number, string]>; // Snippet<[value,variant]>
    value?: number; // bindable; current page (default 1)
    min?: number; // first page (default 1)
    max?: number; // last page (default = max(min, value))
    options?: number[]; // shortcut list shown in the ComboBox (default: magnitude-thinned min..max)
    top?: Snippet<[number, string]>; // Snippet<[value,variant]>; FIRST button content
    left?: Snippet<[number, string]>; // Snippet<[value,variant]>; PREV button content
    right?: Snippet<[number, string]>; // Snippet<[value,variant]>; NEXT button content
    bottom?: Snippet<[number, string]>; // Snippet<[value,variant]>; LAST button content
    ariaLabel?: string; // nav landmark label (default "Pagination")
    ariaTopLabel?: string; // FIRST (default "First page")
    ariaLeftLabel?: string; // PREV  (default "Previous page")
    ariaRightLabel?: string; // NEXT  (default "Next page")
    ariaBottomLabel?: string; // LAST  (default "Last page")
    comboBox?: Omit<ComboBoxProps, ComboBoxReqdProps | ComboBoxBindProps | "options" | "variant" | "styling">;
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type PaginationReqdProps = never;
  export type PaginationBindProps = "value";
  export const _PAGINATION_PRESET = "svs-pagination";

  import { untrack } from "svelte";
  import { VARIANT, PARTS, _fnClass } from "./_core";
  import ComboBox, { _COMBO_BOX_PRESET, _setComboBoxContext } from "./ComboBox.svelte";
  import type { Snippet } from "svelte";
  import type { MouseEventHandler } from "svelte/elements";
  import type { SVSClass, SVSVariant } from "./_core";
  import type { ComboBoxContext, ComboBoxProps, ComboBoxReqdProps, ComboBoxBindProps } from "./ComboBox.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { children, value = $bindable(1), min = 1, max, options, top, left, right, bottom, ariaLabel = "Pagination", ariaTopLabel = "First page", ariaLeftLabel = "Previous page", ariaRightLabel = "Next page", ariaBottomLabel = "Last page", comboBox, styling, variant = VARIANT.NEUTRAL }: PaginationProps = $props();

  // *** Initialize *** //
  const cls = $derived(_fnClass(_PAGINATION_PRESET, styling));

  // *** States *** //
  const lo = $derived(Math.trunc(min));
  const hi = $derived(Math.max(lo, Math.trunc(max ?? Math.max(lo, value))));
  const atMin = $derived(value <= lo);
  const atMax = $derived(value >= hi);
  const optionSet = $derived(new Set((options ?? thin(lo, hi, value)).map(String)));
  let text = $state(String(value));

  // *** Initialize Context *** //
  const ctx: ComboBoxContext = {
    get options() {
      return optionSet;
    },
    get value() {
      return text;
    },
    set value(v) {
      text = v;
    },
    get variant() {
      return variant;
    },
    get styling() {
      return `${_PAGINATION_PRESET} ${_COMBO_BOX_PRESET}`;
    },
    commit,
  };
  _setComboBoxContext(ctx);

  // *** Reactive Handlers *** //
  $effect.pre(() => {
    lo;
    hi;
    value;
    untrack(() => sync());
  });
  $effect(() => {
    value;
    untrack(() => {
      text = String(value);
    });
  });

  function sync() {
    const next = clamp(value);
    if (next !== value) value = next;
  }
  function clamp(n: number): number {
    return Math.min(hi, Math.max(lo, Math.trunc(n)));
  }
  function parse(v: string): number | undefined {
    const t = v.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isInteger(n) ? n : undefined;
  }
  function commit() {
    const next = parse(text);
    if (next !== undefined) value = clamp(next);
    text = String(value);
  }
  function thin(min: number, max: number, value: number): number[] {
    const v = Math.trunc(value);
    const arr = (add: boolean) => {
      const d = Math.max(1, Math.trunc(max / 10));
      const r = (n: number) => Math.round(n / d) * d;
      const delta = [1, 1, d, d * 2];
      const result: number[] = [];
      for (const step of delta) {
        const next = (result.at(-1) ?? v) + (add ? step : -step);
        result.push(step === 1 ? next : r(next));
      }
      return result;
    };
    return [...new Set<number>([v, min, max, ...arr(true), ...arr(false)])].filter((n) => min <= n && n <= max).sort((a, b) => a - b);
  }

  // *** Event Handlers *** //
  const htop: MouseEventHandler<HTMLButtonElement> = () => {
    if (atMin) return;
    value = lo;
  };
  const hleft: MouseEventHandler<HTMLButtonElement> = () => {
    if (atMin) return;
    value = clamp(value - 1);
  };
  const hright: MouseEventHandler<HTMLButtonElement> = () => {
    if (atMax) return;
    value = clamp(value + 1);
  };
  const hbottom: MouseEventHandler<HTMLButtonElement> = () => {
    if (atMax) return;
    value = hi;
  };
</script>

<!---------------------------------------->

<nav class={cls(PARTS.WHOLE, variant)} aria-label={ariaLabel}>
  <button
    class={cls(PARTS.TOP, atMin ? VARIANT.INACTIVE : variant)}
    type="button"
    aria-label={ariaTopLabel}
    aria-disabled={atMin}
    onclick={htop}
  >
    {#if top}
      {@render top(value, variant)}
    {:else}
      {@render glyphLeftDouble()}
    {/if}
  </button>
  <button
    class={cls(PARTS.LEFT, atMin ? VARIANT.INACTIVE : variant)}
    type="button"
    aria-label={ariaLeftLabel}
    aria-disabled={atMin}
    onclick={hleft}
  >
    {#if left}
      {@render left(value, variant)}
    {:else}
      {@render glyphLeft()}
    {/if}
  </button>
  {#if children}
    {@render children(value, variant)}
  {:else}
    <ComboBox {...comboBox} />
  {/if}
  <button
    class={cls(PARTS.RIGHT, atMax ? VARIANT.INACTIVE : variant)}
    type="button"
    aria-label={ariaRightLabel}
    aria-disabled={atMax}
    onclick={hright}
  >
    {#if right}
      {@render right(value, variant)}
    {:else}
      {@render glyphRight()}
    {/if}
  </button>
  <button
    class={cls(PARTS.BOTTOM, atMax ? VARIANT.INACTIVE : variant)}
    type="button"
    aria-label={ariaBottomLabel}
    aria-disabled={atMax}
    onclick={hbottom}
  >
    {#if bottom}
      {@render bottom(value, variant)}
    {:else}
      {@render glyphRightDouble()}
    {/if}
  </button>
</nav>

{#snippet glyphLeft()}
  <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12">
    <path d="M10.5 2 4.5 8l6 6 1.4-1.4L7.3 8l4.6-4.6z" />
  </svg>
{/snippet}
{#snippet glyphLeftDouble()}
  <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12">
    <path d="M7.5 2 1.5 8l6 6 1.4-1.4L4.3 8l4.6-4.6z" />
    <path d="M13.5 2 7.5 8l6 6 1.4-1.4L10.3 8l4.6-4.6z" />
  </svg>
{/snippet}
{#snippet glyphRight()}
  <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12">
    <path d="m5.5 2 6 6-6 6-1.4-1.4L8.7 8 4.1 3.4z" />
  </svg>
{/snippet}
{#snippet glyphRightDouble()}
  <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="12" height="12">
    <path d="m2.5 2 6 6-6 6-1.4-1.4L5.7 8 1.1 3.4z" />
    <path d="m8.5 2 6 6-6 6-1.4-1.4L11.7 8 7.1 3.4z" />
  </svg>
{/snippet}
