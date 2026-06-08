<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface AccordionProps {
    items: AccordionItem[];
    current?: string; // bindable, undefined = all closed
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    deps?: AccordionDeps;
  }
  interface AccordionDeps {
    svsDisclosure?: Omit<DisclosureProps, DisclosureReqdProps | DisclosureBindProps>;
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
  ### Anatomy
  ```svelte
  <div class="whole" role="group">
    {#each items as item}
      <Disclosure label={item.label} variant={...} aria-disabled={item.disabled}>
        {item.panel}
      </Disclosure>
    {/each}
  </div>
  ```
-->
<script module lang="ts">
  export interface AccordionProps {
    items: AccordionItem[];
    current?: string; // bindable, undefined = all closed
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    deps?: AccordionDeps;
  }
  export interface AccordionDeps {
    svsDisclosure?: Omit<DisclosureProps, DisclosureReqdProps | DisclosureBindProps>;
  }
  export type AccordionReqdProps = "items";
  export type AccordionBindProps = "current";
  export type AccordionComponent = { component: Component<any>; props?: Record<string, unknown> };
  export type AccordionItem = {
    value: string; // REQUIRED, unique within `items`. Addresses `current`.
    label: string | Snippet<[boolean, string]> | AccordionComponent;
    panel: Snippet<[string]> | AccordionComponent;
    disabled?: boolean; // (false)
  };

  const preset = "svs-accordion";

  function isComponent(x: unknown): x is AccordionComponent {
    return typeof x === "object" && x !== null && "component" in x;
  }

  import { type Component, type Snippet, untrack } from "svelte";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, omit } from "./core";
  import Disclosure, { type DisclosureProps, type DisclosureReqdProps, type DisclosureBindProps } from "./_Disclosure.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { items, current = $bindable<string | undefined>(), styling, variant = VARIANT.NEUTRAL, deps }: AccordionProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const selected = $derived(items.some((it) => it.value === current && !it.disabled) ? current : undefined);

  // *** Initialize Deps *** //
  const svsDisclosure = $derived({
    ...omit(deps?.svsDisclosure, "styling"),
    styling: deps?.svsDisclosure?.styling ?? `${preset} svs-disclosure`,
  });

  // *** Bind Handlers *** //
  $effect(() => {
    if (current !== selected) untrack(() => (current = selected));
  });
</script>

<!---------------------------------------->

{#if items.length > 0}
  <div class={cls(PARTS.WHOLE, variant)} role="group">
    {#each items as item, i (item.value)}
      {#snippet label(open: boolean, variant: string)}
        {@render labelContent(item.label, open, variant)}
      {/snippet}
      {#snippet children(variant: string)}
        {@render panelContent(item.panel, variant)}
      {/snippet}
      <Disclosure
        {label}
        {children}
        variant={item.disabled ? VARIANT.INACTIVE : variant}
        aria-disabled={item.disabled ? "true" : undefined}
        class={item.disabled ? VARIANT.INACTIVE : undefined}
        bind:open={
          () => !item.disabled && current === item.value,
          (v) => {
            if (item.disabled) return;
            current = v ? item.value : undefined;
          }
        }
        {...svsDisclosure}
      />
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
