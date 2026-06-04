<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ProgressTrackerProps {
    current: number; // (0)
    labels: string[];
    children?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    aux?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    extra?: boolean | Snippet<[number, string, string]>; // (true) Snippet<[index,label,variant]>
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    eachVariant?: SvelteMap<number, string> | Map<number, string>;
  }
  ```
  ### Anatomy
  ```svelte
  <ol class="whole">
    {#each labels as label}
      <li class="middle">
        <div class="main">
          <div class="aux" conditional>{aux}</div>
          <div class="label">{label} or {children}</div>
        </div>
        <div class="extra" conditional>{extra}</div>
      </li>
    {/each}
  </ol>
  ```
-->
<script module lang="ts">
  export interface ProgressTrackerProps {
    current: number; // (0)
    labels: string[];
    children?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    aux?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    extra?: boolean | Snippet<[number, string, string]>; // (true) Snippet<[index,label,variant]>
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    eachVariant?: SvelteMap<number, string> | Map<number, string>;
  }
  export type ProgressTrackerReqdProps = "current" | "labels";
  export type ProgressTrackerBindProps = never;

  const preset = "svs-progress-tracker";

  import { type Snippet } from "svelte";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isUnsignedInteger } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { current = -1, labels, children, aux, extra = true, styling, variant = VARIANT.NEUTRAL, eachVariant }: ProgressTrackerProps = $props();

  // *** Initialize *** //
  const cur = $derived(isUnsignedInteger(current) ? current : 0);
  const cls = $derived(fnClass(preset, styling));

  // *** States *** //
  function getEachVariant(index: number): string {
    if (eachVariant?.has(index)) return eachVariant.get(index)!;
    if (index < cur) return VARIANT.ACTIVE;
    if (index > cur) return VARIANT.INACTIVE;
    return variant;
  }
  function isInner(index: number): boolean {
    return index < labels.length - 1;
  }
</script>

<!---------------------------------------->

{#if labels.length}
  <ol class={cls(PARTS.WHOLE, variant)}>
    {#each labels as label, i}
      {@const stat = getEachVariant(i)}
      <li class={cls(PARTS.MIDDLE, stat)} aria-current={i === cur ? "step" : false} style={isInner(i) ? "flex-grow:1;" : undefined}>
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
        {#if extra !== false && isInner(i)}
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
