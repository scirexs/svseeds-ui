<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface ProgressTrackerProps extends Omit<HTMLOlAttributes, "children"> {
    current: number; // (0)
    labels: string[];
    children?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    aux?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    extra?: boolean | Snippet<[number, string, string]>; // (true) Snippet<[index,label,variant]>
    statusLabels?: Partial<Record<string, string>>; // variant -> screen-reader suffix
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    eachVariant?: SvelteMap<number, string> | Map<number, string>;
    // other HTMLOlAttributes are passed to <ol> via ...rest; `class` is merged onto the root
  }
  ```
  ### Anatomy
  ```svelte
  <ol class="whole" {...rest}>
    {#each labels as label}
      <li class="middle">
        <div class="main">
          <div class="aux" conditional>{aux}</div>
          <div class="label">{label} or {children}</div>
        </div>
        <div class="extra" aria-hidden="true" conditional>{extra}</div>
      </li>
    {/each}
  </ol>
  ```
  Inner-step growth can be applied by consumer CSS, e.g. `li:not(:last-child) { flex-grow: 1 }`.
-->
<script module lang="ts">
  export interface ProgressTrackerProps extends Omit<HTMLOlAttributes, "children"> {
    current: number; // (0)
    labels: string[];
    children?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    aux?: Snippet<[number, string, string]>; // Snippet<[index,label,variant]>
    extra?: boolean | Snippet<[number, string, string]>; // (true) Snippet<[index,label,variant]>
    statusLabels?: Partial<Record<string, string>>;
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    eachVariant?: SvelteMap<number, string> | Map<number, string>;
  }
  export type ProgressTrackerReqdProps = "current" | "labels";
  export type ProgressTrackerBindProps = never;

  const preset = "svs-progress-tracker";

  import { type Snippet } from "svelte";
  import { type SvelteMap } from "svelte/reactivity";
  import { type HTMLOlAttributes } from "svelte/elements";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isUnsignedInteger } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { current = -1, labels, children, aux, extra = true, statusLabels, styling, variant = VARIANT.NEUTRAL, eachVariant, class: c, ...rest }: ProgressTrackerProps = $props();

  // *** Initialize *** //
  const defaultStatus: Record<string, string> = { [VARIANT.ACTIVE]: "completed" };
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
  function statusSuffix(stat: string): string {
    return statusLabels ? (statusLabels[stat] ?? "") : (defaultStatus[stat] ?? "");
  }
  function ariaLabelOf(label: string, stat: string, index: number): string | undefined {
    if (index === cur) return undefined;
    const s = statusSuffix(stat);
    return s ? `${label}, ${s}` : undefined;
  }
</script>

<!---------------------------------------->

{#if labels.length}
  <ol class={[cls(PARTS.WHOLE, variant), c]} {...rest}>
    {#each labels as label, i}
      {@const stat = getEachVariant(i)}
      <li class={cls(PARTS.MIDDLE, stat)} aria-current={i === cur ? "step" : false} aria-label={ariaLabelOf(label, stat, i)}>
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
          <div class={cls(PARTS.EXTRA, stat)} aria-hidden="true">
            {#if typeof extra === "function"}
              {@render extra(i, label, stat)}
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
