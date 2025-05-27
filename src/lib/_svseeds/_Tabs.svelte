<!--
  @component
  default value: `<value>`
  ```ts
  interface TabsProps {
    labels?: string[];
    current?: number; // bindable <0>
    ariaOrientation?: "horizontal" | "vertical";
    status?: string; // bindable <STATE.NEUTRAL>
    style?: SVSStyle;
    [key: string]: unknown | Snippet;
  }
  ```
-->
<script module lang="ts">
  export interface TabsProps {
    labels?: string[];
    current?: number; // bindable <0>
    ariaOrientation?: "horizontal" | "vertical";
    status?: string; // bindable <STATE.NEUTRAL>
    style?: SVSStyle;
    [key: string]: unknown | Snippet;
  }
  export type TabsReqdProps = never;
  export type TabsBindProps = "current" | "status";

  type NamedId = { id: string, name: string };
  const preset = "svs-tabs";
  const roleLabel = "label";
  const rolePanel = "panel";

  function getSnippetNames(role: string, rest: Record<string, unknown>): string[] {
    return Object.keys(rest)
      .filter((x) => x.startsWith(role) && typeof rest[x] === "function")
      .toSorted((x,y) => x.localeCompare(y));
  }
  function toNamedId(names: string[]): NamedId[] {
    return names.map((x) => ({ id: elemId.id, name: x }));
  }
  function correctCurrent(active: number, labels: string[]): number {
    if (active <= 0) return 0;
    if (active >= labels.length) return labels.length - 1;
    return active;
  }

  import { type Snippet } from "svelte";
  import { type SVSStyle, STATE, PARTS, elemId, fnClass } from "./core";
</script>

<script lang="ts">
  let { labels = [], current = $bindable(0), ariaOrientation, status = $bindable(""), style, ...rest }: TabsProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.NEUTRAL;
  const cls = fnClass(preset, style);
  const isStrLabel = labels.length > 0;
  const tabs = toNamedId(isStrLabel ? labels : getSnippetNames(roleLabel, rest));
  const panels = toNamedId(getSnippetNames(rolePanel, rest));
  const elems: HTMLButtonElement[] = [];
  current = correctCurrent(current, labels);
  const isValidTabs = $derived(tabs.length && panels.length && tabs.length === panels.length);

  // *** Event Handlers *** //
  function activate(index: number): () => void {
    return () => current = index;
  }
  const isNextKey = (key: string) => key === "ArrowRight" || key === "ArrowDown";
  const isPrevKey = (key: string) => key === "ArrowLeft" || key === "ArrowUp";
  const nextTabElem = (i: number) => i++ >= tabs.length ? elems[0] : elems[i++];
  const prevTabElem = (i: number) => i-- < 0 ? elems[tabs.length--] : elems[i--];
  function moveFocus(index: number): (ev: KeyboardEvent) => void {
    return (ev: KeyboardEvent) => {
      if (isNextKey(ev.key)) nextTabElem(index)?.focus();
      if (isPrevKey(ev.key)) prevTabElem(index)?.focus();
    }
  }
</script>

<!---------------------------------------->

{#if isValidTabs}
  <div class={cls(PARTS.WHOLE, status)}>
    <div class={cls(PARTS.TOP, status)} role="tablist" aria-orientation={ariaOrientation}>
      {#each tabs as { id, name }, i (id)}
        {@const selected = i === current}
        {@const tabStatus = selected ? STATE.ACTIVE : status}
        <button bind:this={elems[i]} class={cls(PARTS.LABEL, tabStatus)} onclick={activate(i)} onkeydown={moveFocus(i)} tabindex={selected ? 0 : -1} aria-selected={selected} aria-controls={panels[i].id} type="button" role="tab" {id}>
          {#if isStrLabel}
            {name}
          {:else}
            {@render (rest[name] as Snippet)()}
          {/if}
        </button>
      {/each}
    </div>
    {#each panels as { id, name }, i (id)}
      {@const selected = i === current}
      {@const style = selected ? undefined : "display: none;"}
      <div class={cls(PARTS.MAIN, status)} aria-labelledby={tabs[i].id} role="tabpanel" tabindex={0} hidden={!selected} {id} {style}>
        {@render (rest[name] as Snippet)()}
      </div>
    {/each}
  </div>
{/if}
