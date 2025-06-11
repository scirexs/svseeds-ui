<!--
  @component
  default value: `(value)`
  ```ts
  interface ProgressTrackerProps {
    current: number; // bindable (0)
    labels: string[];
    aux?: Snippet<[number, string]>; // Snippet<[index,variant]>
    extra?: Snippet<[number, string]>; // Snippet<[index,variant]>
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
    eachVariant?: SvelteMap<number, string> | Map<number, string>;
  }
  ```
-->
<script module lang="ts">
  export interface ProgressTrackerProps {
    current: number; // bindable (0)
    labels: string[];
    aux?: Snippet<[number, string]>; // Snippet<[index,variant]>
    extra?: Snippet<[number, string]>; // Snippet<[index,variant]>
    styling?: SVSClass;
    variant?: string; // bindable (VARIANT.NEUTRAL)
    eachVariant?: SvelteMap<number, string> | Map<number, string>;
  }
  export type ProgressTrackerReqdProps = "current" | "labels";
  export type ProgressTrackerBindProps = "current" | "variant";

  const preset = "svs-progress-tracker";

  import { type Snippet } from "svelte";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSClass, VARIANT, PARTS, fnClass, isUnsignedInteger } from "./core";
</script>

<script lang="ts">
  let { current = $bindable(-1), labels, aux, extra, styling, variant = $bindable(""), eachVariant }: ProgressTrackerProps = $props();

  // *** Initialize *** //
  if (!variant) variant = VARIANT.NEUTRAL;
  if (!isUnsignedInteger(current)) current = 0;
  const cls = fnClass(preset, styling);

  // *** States *** //
  function getEachVariant(index: number): string {
    if (eachVariant?.has(index)) return eachVariant.get(index)!;
    if (index < current) return VARIANT.ACTIVE;
    if (index > current) return VARIANT.INACTIVE;
    return variant;
  }
</script>

<!---------------------------------------->

{#if labels.length}
  <ol class={cls(PARTS.WHOLE, variant)}>
    {#each labels as label, i}
      {@const stat = getEachVariant(i)}
      <li class={cls(PARTS.MAIN, stat)} aria-current={i === current ? "step" : false}>
        {#if i > current}
          {@render separator(i)}
        {/if}
        {#if aux}
          <div class={cls(PARTS.MIDDLE, stat)}>
            <div class={cls(PARTS.AUX, stat)}>
              {@render aux(i, stat)}
            </div>
            <div class={cls(PARTS.LABEL, stat)}>
              {label}
            </div>
          </div>
        {:else}
          <div class={cls(PARTS.LABEL, stat)}>
            {label}
          </div>
        {/if}
      </li>
      {#if i < current}
        {@render separator(i)}
      {/if}
    {/each}
  </ol>
{/if}

{#snippet separator(i: number)}
  {#if extra}
    {@const stat = i < current ? VARIANT.ACTIVE : VARIANT.INACTIVE}
    <div class={cls(PARTS.EXTRA, stat)} role="separator">
      {@render extra(i, stat)}
    </div>
  {/if}
{/snippet}
