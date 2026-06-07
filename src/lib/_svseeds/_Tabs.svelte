<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface TabsProps {
    tabs: TabItem[];
    current?: string; // bindable (first enabled tab value)
    manual?: boolean; // (false) manual activation: Arrow keys only move focus; Enter/Space selects
    ariaOrientation?: "horizontal" | "vertical"; // ("horizontal")
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  type TabComponent = { component: Component<any>; props?: Record<string, unknown> };
  type TabItem = {
    value: string; // REQUIRED, unique within `tabs`. Addresses `current`.
    label: string | Snippet | TabComponent;
    panel: Snippet | TabComponent;
    disabled?: boolean; // (false)
  };
  ```
  `value`s must be unique within `tabs`.
  ### Anatomy
  ```svelte
  <div class="whole">
    <div class="top" role="tablist" aria-orientation={ariaOrientation}>
      {#each tabs as tab}
        <button class="label" role="tab">{tab.label}</button>
      {/each}
    </div>
    {#each tabs as tab}
      <div class="main" role="tabpanel" hidden={!selected}>{tab.panel}</div>
    {/each}
  </div>
  ```
-->
<script module lang="ts">
  export interface TabsProps {
    tabs: TabItem[];
    current?: string; // bindable (first enabled tab value)
    manual?: boolean; // (false) manual activation: Arrow keys only move focus; Enter/Space selects
    ariaOrientation?: "horizontal" | "vertical"; // ("horizontal")
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
  }
  export type TabsReqdProps = "tabs";
  export type TabsBindProps = "current";
  export type TabComponent = { component: Component<any>; props?: Record<string, unknown> };
  export type TabItem = {
    value: string; // REQUIRED, unique within `tabs`. Addresses `current`.
    label: string | Snippet | TabComponent;
    panel: Snippet | TabComponent;
    disabled?: boolean; // (false)
  };

  const preset = "svs-tabs";

  export function toPanel(component: Component<any>, props?: Record<string, unknown>): TabComponent {
    return { component, props };
  }
  function firstSelectableIndex(tabs: TabItem[]): number {
    return tabs.findIndex((tab) => !tab.disabled);
  }
  function firstSelectableValue(tabs: TabItem[]): string | undefined {
    const index = firstSelectableIndex(tabs);
    return index >= 0 ? tabs[index].value : undefined;
  }
  function isTabComponent(x: unknown): x is TabComponent {
    return typeof x === "object" && x !== null && "component" in x;
  }

  import { type Component, type Snippet, untrack } from "svelte";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass } from "./core";
</script>

<script lang="ts">
  // prettier-ignore
  let { tabs, current = $bindable<string | undefined>(undefined), manual = false, ariaOrientation = "horizontal", styling, variant = VARIANT.NEUTRAL }: TabsProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const uid = $props.id();
  const selected = $derived(tabs.some((tab) => tab.value === current && !tab.disabled) ? current! : firstSelectableValue(tabs));
  const selectedIndex = $derived(tabs.findIndex((tab) => tab.value === selected));
  let focused = $state(0);
  let elems: HTMLButtonElement[] = [];

  // *** Bind Handlers *** //
  $effect.pre(() => {
    current;
    selected;
    untrack(() => {
      if (current !== selected) current = selected;
    });
  });
  $effect(() => {
    tabs;
    selectedIndex;
    manual;
    const next = focusFallback();
    if (next !== focused) focused = next;
  });

  // *** States *** //
  const tabId = (index: number) => `${uid}-tab-${index}`;
  const panelId = (index: number) => `${uid}-panel-${index}`;
  const isSelected = (tab: TabItem) => tab.value === selected;
  const isHorizontal = () => ariaOrientation !== "vertical";
  function tabStatus(tab: TabItem): string {
    if (isSelected(tab)) return VARIANT.ACTIVE;
    if (tab.disabled) return VARIANT.INACTIVE;
    return variant;
  }
  function focusFallback(): number {
    if (!tabs.length) return 0;
    if (!manual && selectedIndex >= 0) return selectedIndex;
    if (focused >= 0 && focused < tabs.length && !tabs[focused]?.disabled) return focused;
    if (selectedIndex >= 0 && !tabs[selectedIndex]?.disabled) return selectedIndex;
    return firstSelectableIndex(tabs);
  }
  function nextSelectableIndex(start: number, step: 1 | -1): number {
    if (!tabs.some((tab) => !tab.disabled)) return -1;
    for (let offset = 1; offset <= tabs.length; offset += 1) {
      const index = (start + step * offset + tabs.length) % tabs.length;
      if (!tabs[index].disabled) return index;
    }
    return -1;
  }
  function edgeSelectableIndex(edge: "first" | "last"): number {
    if (edge === "first") return tabs.findIndex((tab) => !tab.disabled);
    for (let i = tabs.length - 1; i >= 0; i -= 1) {
      if (!tabs[i].disabled) return i;
    }
    return -1;
  }
  function targetIndex(key: string, index: number): number {
    if (key === "Home") return edgeSelectableIndex("first");
    if (key === "End") return edgeSelectableIndex("last");
    if (isHorizontal()) {
      if (key === "ArrowRight") return nextSelectableIndex(index, 1);
      if (key === "ArrowLeft") return nextSelectableIndex(index, -1);
    } else {
      if (key === "ArrowDown") return nextSelectableIndex(index, 1);
      if (key === "ArrowUp") return nextSelectableIndex(index, -1);
    }
    return -1;
  }

  // *** Event Handlers *** //
  function activate(tab: TabItem) {
    if (!tab.disabled) current = tab.value;
  }
  function moveFocus(index: number, ev: KeyboardEvent) {
    const target = targetIndex(ev.key, index);
    if (target < 0) return;
    ev.preventDefault();
    focused = target;
    elems[target]?.focus();
    if (!manual) current = tabs[target].value;
  }
  function hfocusin(ev: FocusEvent) {
    const index = elems.indexOf(ev.target as HTMLButtonElement);
    if (index >= 0 && !tabs[index]?.disabled) focused = index;
  }
</script>

<!---------------------------------------->

{#if tabs.length > 0}
  <div class={cls(PARTS.WHOLE, variant)}>
    <div class={cls(PARTS.TOP, variant)} role="tablist" aria-orientation={ariaOrientation} onfocusin={hfocusin}>
      {#each tabs as tab, i (tab.value)}
        {@const selected = isSelected(tab)}
        <button
          bind:this={elems[i]}
          class={cls(PARTS.LABEL, tabStatus(tab))}
          onclick={() => activate(tab)}
          onkeydown={(ev) => moveFocus(i, ev)}
          tabindex={i === focused ? 0 : -1}
          aria-selected={selected}
          aria-disabled={tab.disabled ? "true" : undefined}
          aria-controls={panelId(i)}
          type="button"
          role="tab"
          id={tabId(i)}
        >
          {@render content(tab.label)}
        </button>
      {/each}
    </div>
    {#each tabs as tab, i (tab.value)}
      {@const selected = isSelected(tab)}
      {@const style = selected ? undefined : "display:none;"}
      <div
        class={cls(PARTS.MAIN, variant)}
        aria-labelledby={tabId(i)}
        role="tabpanel"
        tabindex={0}
        hidden={!selected}
        id={panelId(i)}
        {style}
      >
        {@render content(tab.panel)}
      </div>
    {/each}
  </div>
{/if}

{#snippet content(c: string | Snippet | TabComponent)}
  {#if typeof c === "string"}
    {c}
  {:else if isTabComponent(c)}
    {@const C = c.component}
    <C {...c.props} />
  {:else}
    {@render c()}
  {/if}
{/snippet}
