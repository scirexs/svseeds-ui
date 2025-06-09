<!--
  @component
  default value: `(value)`
  ```ts
  interface ProgressTrackerProps {
    current: number; // bindable (0)
    labels: string[];
    aux?: Snippet<[string, number]>; // Snippet<[status,index]>
    extra?: Snippet<[string, number]>; // Snippet<[status,index]>
    status?: string; // bindable (STATE.NEUTRAL)
    eachStatus?: SvelteMap<number, string> | Map<number, string>;
    style?: SVSStyle;
  }
  ```
-->
<script module lang="ts">
  export interface ProgressTrackerProps {
    current: number; // bindable (0)
    labels: string[];
    aux?: Snippet<[string, number]>; // Snippet<[status,index]>
    extra?: Snippet<[string, number]>; // Snippet<[status,index]>
    status?: string; // bindable (STATE.NEUTRAL)
    eachStatus?: SvelteMap<number, string> | Map<number, string>;
    style?: SVSStyle;
  }
  export type ProgressTrackerReqdProps = "current" | "labels";
  export type ProgressTrackerBindProps = "current" | "status";

  const preset = "svs-progress-tracker";

  import { type Snippet } from "svelte";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSStyle, STATE, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  let { current = $bindable(0), labels, aux, extra, status = $bindable(""), eachStatus, style }: ProgressTrackerProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.NEUTRAL;
  const cls = fnClass(preset, style);

  // *** Status *** //
  function getEachStatus(index: number): string {
    if (eachStatus?.has(index)) return eachStatus.get(index)!;
    if (index < current) return STATE.ACTIVE;
    if (index > current) return STATE.INACTIVE;
    return status;
  }
</script>

<!---------------------------------------->

{#if labels.length}
  <ol class={cls(PARTS.WHOLE, status)}>
    {#each labels as label, i}
      {@const stat = getEachStatus(i)}
      {#if i > current}
        {@render separator(i)}
      {/if}
      <li class={cls(PARTS.MAIN, stat)} aria-current={i === current ? "step" : false}>
        {#if aux}
          <div class={cls(PARTS.AUX, stat)}>
            {@render aux(stat, i)}
          </div>
        {/if}
        <div class={cls(PARTS.LABEL, stat)}>
          {label}
        </div>
      </li>
      {#if i < current}
        {@render separator(i)}
      {/if}
    {/each}
  </ol>
{/if}

{#snippet separator(i: number)}
  {#if extra}
    {@const stat = i < current ? STATE.ACTIVE : STATE.INACTIVE}
    <li class={cls(PARTS.EXTRA, stat)} role="separator">
      {@render extra(stat, i)}
    </li>
  {/if}
{/snippet}
