<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface AccordionProps {
    items?: AccordionItem[];
    children?: Snippet;
    current?: string; // bindable, undefined = all closed
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    disclosure?: Omit<DisclosureProps, DisclosureReqdProps | DisclosureBindProps | "id" | "inactive">;
  }
  type AccordionComponent = { component: Component<any>; props?: Record<string, unknown> };
  type AccordionItem = {
    value: string; // REQUIRED, unique within `items`. Addresses `current`.
    label: string | Snippet<[boolean, string]> | AccordionComponent;
    panel: Snippet<[string]> | AccordionComponent;
    disabled?: boolean; // (false)
  };
  ```
  `value`s must be unique within `items`. Accordion is exclusive: at most one item is open at a time.
  Provide `items` for data mode or `children` for declarative mode; `children` wins when both are present.
  ### Behavior
  Declarative `<Disclosure id=...>` children automatically coordinate exclusive open state through `current` and inherit the base `variant`/`styling`.
  ### Anatomy
  ```svelte
  <div class="whole" role="group">
    {#if children}
      {children}
    {:else}
      {#each items as item}
        <Disclosure id={item.value} label={item.label} inactive={item.disabled || undefined}>
          {item.panel}
        </Disclosure>
      {/each}
    {/if}
  </div>
  ```
  Data-mode child styling defaults to the combined parent/child preset and can be customized via `disclosure`.
-->
<script module lang="ts">
  export interface AccordionProps {
    items?: AccordionItem[];
    children?: Snippet;
    current?: string; // bindable, undefined = all closed
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    disclosure?: Omit<DisclosureProps, DisclosureReqdProps | DisclosureBindProps | "id" | "inactive">;
  }
  export type AccordionReqdProps = never;
  export type AccordionBindProps = "current";
  export type AccordionComponent = { component: Component<any>; props?: Record<string, unknown> };
  export type AccordionItem = {
    value: string; // REQUIRED, unique within `items`. Addresses `current`.
    label: string | Snippet<[boolean, string]> | AccordionComponent;
    panel: Snippet<[string]> | AccordionComponent;
    disabled?: boolean; // (false)
  };

  export const _ACCORDION_PRESET = "svs-accordion";

  function isComponent(x: unknown): x is AccordionComponent {
    return typeof x === "object" && x !== null && "component" in x;
  }

  import { type Component, type Snippet, untrack } from "svelte";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, omit } from "./core";
  import Disclosure, { _DISCLOSURE_PRESET, _setDisclosureContext, type DisclosureContext, type DisclosureProps, type DisclosureReqdProps, type DisclosureBindProps } from "./_Disclosure.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { items, children, current = $bindable<string | undefined>(), styling, variant = VARIANT.NEUTRAL, disclosure }: AccordionProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(_ACCORDION_PRESET, styling));
  const ctxCurrent = $derived(current);
  const ctxVariant = $derived(variant);
  const ctxStyling = $derived(styling);
  const ctx: DisclosureContext = {
    get current() {
      return ctxCurrent;
    },
    set current(v: string | undefined) {
      current = v;
    },
    get variant() {
      return ctxVariant;
    },
    get styling() {
      return ctxStyling;
    },
  };
  _setDisclosureContext(ctx);
  const selected = $derived(children || !items ? current : items.some((it) => it.value === current && !it.disabled) ? current : undefined);

  // *** Initialize Child Props *** //
  const childProps = $derived({
    ...omit(disclosure, "styling"),
    styling: disclosure?.styling ?? `${_ACCORDION_PRESET} ${_DISCLOSURE_PRESET}`,
  });

  // *** Reactive Handlers *** //
  $effect(() => {
    if (current !== selected) untrack(() => (current = selected));
  });
</script>

<!---------------------------------------->

{#if children}
  <div class={cls(PARTS.WHOLE, variant)} role="group">
    {@render children()}
  </div>
{:else if items && items.length > 0}
  <div class={cls(PARTS.WHOLE, variant)} role="group">
    {#each items as item (item.value)}
      {#snippet label(open: boolean, variant: string)}
        {@render labelContent(item.label, open, variant)}
      {/snippet}
      {#snippet panel(variant: string)}
        {@render panelContent(item.panel, variant)}
      {/snippet}
      <Disclosure id={item.value} {label} children={panel} inactive={item.disabled || undefined} {variant} {...childProps} />
    {/each}
  </div>
{/if}

{#snippet labelContent(c: string | Snippet<[boolean, string]> | AccordionComponent, open: boolean, variant: string)}
  {#if typeof c === "string"}
    {c}
  {:else if isComponent(c)}
    {@const C = c.component}
    <C {...c.props} />
  {:else}
    {@render c(open, variant)}
  {/if}
{/snippet}

{#snippet panelContent(c: Snippet<[string]> | AccordionComponent, variant: string)}
  {#if isComponent(c)}
    {@const C = c.component}
    <C {...c.props} />
  {:else}
    {@render c(variant)}
  {/if}
{/snippet}
