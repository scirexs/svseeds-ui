<script module lang="ts">
  export type ProgressTrackerProps = {
    current: number, // bindable <0>
    labels: string[],
    aux?: Snippet<[string, number]>, // Snippet<[status,index]>
    extra?: Snippet<[string, number]>, // Snippet<[status,index]>
    status?: string, // bindable <STATE.DEFAULT>
    eachStatus?: SvelteMap<number, string> | Map<number, string>,
    style?: SVSStyle,
  };
  export type ProgressTrackerReqdProps = "current" | "labels";
  export type ProgressTrackerBindProps = "current" | "status";

  const preset = "svs-progress-tracker";

  import { type Snippet } from "svelte";
  import { type SvelteMap } from "svelte/reactivity";
  import { type SVSStyle, STATE, AREA, fnClass } from "./core";
</script>

<script lang="ts">
  let { current = $bindable(0), labels, aux, extra, status = $bindable(""), eachStatus, style }: ProgressTrackerProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
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
  <ol class={cls(AREA.WHOLE, status)}>
    {#each labels as label, i}
      {@const stat = getEachStatus(i)}
      {#if i > current}
        {@render separator(i)}
      {/if}
      <li class={cls(AREA.MAIN, stat)} aria-current={i === current ? "step" : false}>
        {#if aux}
          <div class={cls(AREA.AUX, stat)}>
            {@render aux(stat, i)}
          </div>
        {/if}
        <div class={cls(AREA.LABEL, stat)}>
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
    <li class={cls(AREA.EXTRA, stat)} role="separator">
      {@render extra(stat, i)}
    </li>
  {/if}
{/snippet}
