<!--
  @component
  default value: `(value)`
  ```ts
  interface ProgressTrackerProps {
    current: number; // bindable (0)
    labels: string[];
    children?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    aux?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    extra?: boolean | Snippet<[number, string, string]>; // (true) Snippet<[index,label,variant]>
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
    children?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    aux?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    extra?: boolean | Snippet<[number, string, string]>; // (true) Snippet<[index,label,variant]>
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
  let { current = $bindable(-1), labels, children, aux, extra = true, styling, variant = $bindable(""), eachVariant }: ProgressTrackerProps = $props();

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
      <li class={cls(PARTS.MIDDLE, stat)} aria-current={i === current ? "step" : false} style={i < labels.length - 1 ? "flex-grow:1;" : undefined}>
        <div class={cls(PARTS.MAIN, stat)}>
          {#if aux}
            <div class={cls(PARTS.AUX, stat)}>
              {@render aux(i, label, stat)}
            </div>
          {/if}
          <div class={cls(PARTS.LABEL, stat)}>
            {#if children}
              {@render children(i, label, stat)}
            {:else}
              {label}
            {/if}
          </div>
        </div>
        {#if extra !== false && i < labels.length - 1 }
          <div class={cls(PARTS.EXTRA, stat)} role="separator">
            {#if typeof extra === "function"}
              {@render extra(i, label, stat)}
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
