<!--
  @component
  ### Types
  default value: *`(value)`*
  ```ts
  interface AccordionProps {
    labels?: string[];
    current?: number; // bindable (-1)
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    deps?: AccordionDeps;
    [key: string]: unknown | Snippet; // labels or contents of each disclosure
  }
  interface AccordionDeps {
    svsDisclosure?: Omit<DisclosureProps, DisclosureReqdProps | DisclosureBindProps>;
  }
  ```
  ### Anatomy
  ```svelte
  <div class="whole">
    {#each labels as label, i}
      <Disclosure {label}>
        {@render restProps[i]()}
      </Disclosure>
    {/each}
  </div>
  ```
-->
<script module lang="ts">
  export interface AccordionProps {
    labels?: string[];
    current?: number; // bindable (-1)
    styling?: SVSClass;
    variant?: SVSVariant; // (VARIANT.NEUTRAL)
    deps?: AccordionDeps;
    [key: string]: unknown | Snippet; // labels or contents of each disclosure
  }
  export interface AccordionDeps {
    svsDisclosure?: Omit<DisclosureProps, DisclosureReqdProps | DisclosureBindProps>;
  }
  export type AccordionReqdProps = never;
  export type AccordionBindProps = "current";

  type NamedId = { id: string; name: string };
  const preset = "svs-accordion";
  const roleLabel = "label";
  const rolePanel = "panel";

  function getSnippetNames(role: string, rest: Record<string, unknown>): string[] {
    return Object.keys(rest)
      .filter((x) => x.startsWith(role) && typeof rest[x] === "function")
      .sort((x, y) => x.localeCompare(y));
  }
  function toNamedId(uid: string, names: string[]): NamedId[] {
    return names.map((x, i) => ({ id: `${uid}-${i}`, name: x }));
  }

  import { type Snippet } from "svelte";
  import { type SVSClass, type SVSVariant, VARIANT, PARTS, fnClass, omit } from "./core";
  import Disclosure, { type DisclosureProps, type DisclosureReqdProps, type DisclosureBindProps } from "./_Disclosure.svelte";
</script>

<script lang="ts">
  // prettier-ignore
  let { labels = [], current = $bindable(-1), styling, variant = VARIANT.NEUTRAL, deps, ...rest }: AccordionProps = $props();

  // *** Initialize *** //
  const cls = $derived(fnClass(preset, styling));
  const uid = $props.id();
  const isStrLabel = $derived(labels.length > 0);
  const lbls = $derived(toNamedId(uid, isStrLabel ? labels : getSnippetNames(roleLabel, rest)));
  const panels = $derived(getSnippetNames(rolePanel, rest));
  const isValidAccordion = $derived(lbls.length && panels.length && lbls.length === panels.length);

  // *** Initialize Deps *** //
  // svelte-ignore state_referenced_locally
  const svsDisclosure = {
    ...omit(deps?.svsDisclosure, "styling"),
    styling: deps?.svsDisclosure?.styling ?? `${preset} svs-disclosure`,
  };
</script>

<!---------------------------------------->

{#if isValidAccordion}
  <div class={cls(PARTS.WHOLE, variant)} role="group">
    {#each lbls as { id, name }, i (id)}
      <Disclosure
        bind:open={() => current === i, (v) => (current = v ? i : -1)}
        label={isStrLabel ? name : (rest[name] as Snippet)}
        {...svsDisclosure}
      >
        {@render (rest[panels[i]] as Snippet)()}
      </Disclosure>
    {/each}
  </div>
{/if}
