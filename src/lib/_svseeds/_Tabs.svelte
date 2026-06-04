<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface TabsProps {
    labels?: string[];
    current?: number; // bindable (0)
    ariaOrientation?: "horizontal" | "vertical";
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    [key: string]: unknown | Snippet; // labels or contents of each tab
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" aria-orientation={ariaOrientation}>
      {#each labels as label}
        <button class="label">{label}</button>
      {/each}
    </div>
    {#each restProps as snippet}
      <div class="main">{snippet}</div>
    {/each}
  </div>
  ```
-->
<script module lang="ts">
  export interface TabsProps {
    labels?: string[];
    current?: number; // bindable (0)
    ariaOrientation?: "horizontal" | "vertical";
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    [key: string]: unknown | Snippet; // labels or contents of each tab
  }
  export type TabsReqdProps = never;
  export type TabsBindProps = "current";

  type NamedId = { id: string; name: string };
  const preset = "svs-tabs";
  const roleLabel = "label";
  const rolePanel = "panel";

  function getSnippetNames(role: string, rest: Record<string, unknown>): string[] {
    return Object.keys(rest)
      .filter((x) => x.startsWith(role) && typeof rest[x] === "function")
      .sort((x, y) => x.localeCompare(y));
  }
  function toNamedId(uid: string, prefix: string, names: string[]): NamedId[] {
    return names.map((x, i) => ({ id: `${uid}-${prefix}-${i}`, name: x }));
  }
  function correctCurrent(current: number, tabs: NamedId[]): number {
    if (!isUnsignedInteger(current)) return 0;
    if (current >= tabs.length) return tabs.length - 1;
    return current;
  }

  import { type Snippet } from "svelte";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, isUnsignedInteger } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { labels = [], current = $bindable(0), ariaOrientation, styling, variant = VARIANT.NEUTRAL, ...rest }: TabsProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const uid = $props.id();
  // svelte-ignore state_referenced_locally
  const isStrLabel = labels.length > 0;
  // svelte-ignore state_referenced_locally
  const tabs = toNamedId(uid, "tab", isStrLabel ? labels : getSnippetNames(roleLabel, rest));
  // svelte-ignore state_referenced_locally
  const panels = toNamedId(uid, "panel", getSnippetNames(rolePanel, rest));
  const elems: HTMLButtonElement[] = [];
  current = correctCurrent(current, tabs);
  const isValidTabs = $derived(tabs.length && panels.length && tabs.length === panels.length);

  // *** Event Handlers *** //
  function activate(index: number): () => void {
    return () => (current = index);
  }
  const isNextKey = (key: string) => key === "ArrowRight" || key === "ArrowDown";
  const isPrevKey = (key: string) => key === "ArrowLeft" || key === "ArrowUp";
  const nextTabElem = (i: number) => (i + 1 >= tabs.length ? elems[0] : elems[i + 1]);
  const prevTabElem = (i: number) => (i - 1 < 0 ? elems[tabs.length - 1] : elems[i - 1]);
  function moveFocus(index: number): (ev: KeyboardEvent) => void {
    return (ev: KeyboardEvent) => {
      if (isNextKey(ev.key)) nextTabElem(index)?.focus();
      if (isPrevKey(ev.key)) prevTabElem(index)?.focus();
    };
  }
</script>

<!---------------------------------------->

{#if isValidTabs}
  <div class={cls(PARTS.WHOLE, variant)}>
    <div class={cls(PARTS.TOP, variant)} role="tablist" aria-orientation={ariaOrientation}>
      {#each tabs as { id, name }, i (id)}
        {@const selected = i === current}
        {@const tabStatus = selected ? VARIANT.ACTIVE : variant}
        <button
          bind:this={elems[i]}
          class={cls(PARTS.LABEL, tabStatus)}
          onclick={activate(i)}
          onkeydown={moveFocus(i)}
          tabindex={selected ? 0 : -1}
          aria-selected={selected}
          aria-controls={panels[i].id}
          type="button"
          role="tab"
          {id}
        >
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
      <div class={cls(PARTS.MAIN, variant)} aria-labelledby={tabs[i].id} role="tabpanel" tabindex={0} hidden={!selected} {id} {style}>
        {@render (rest[name] as Snippet)()}
      </div>
    {/each}
  </div>
{/if}
