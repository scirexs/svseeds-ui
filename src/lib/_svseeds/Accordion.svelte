<script module lang="ts">
  export type AccordionProps = {
    labels?: string[],
    current?: number, // bindable <-1>
    status?: string, // bindable <STATE.DEFAULT>
    style?: SVSStyle,
    deps?: AccordionDeps,
    [key: string]: unknown | Snippet,
  };
  export type AccordionDeps = {
    svsDisclosure?: Omit<DisclosureProps, DisclosureReqdProps | DisclosureBindProps>,
  };
  export type AccordionReqdProps = never;
  export type AccordionBindProps = "current" | "status";

  type NamedId = { id: string, name: string };
  const preset = "svs-accordion";
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

  import { type Snippet, untrack } from "svelte";
  import { type SVSStyle, STATE, PARTS, elemId, fnClass, omit } from "./core";
  import Disclosure, { type DisclosureProps, type DisclosureReqdProps, type DisclosureBindProps } from "./_Disclosure.svelte";
</script>

<script lang="ts">
  let { labels = [], current = $bindable(-1), status = $bindable(""), style, deps, ...rest }: AccordionProps = $props();

  // *** Initialize *** //
  if (!status) status = STATE.DEFAULT;
  const cls = fnClass(preset, style);
  const isStrLabel = labels.length > 0;
  const lbls = toNamedId(isStrLabel ? labels : getSnippetNames(roleLabel, rest));
  const panels = getSnippetNames(rolePanel, rest);
  const isValidAccordion = lbls.length && panels.length && lbls.length === panels.length;
  let guard = current >= 0 && current < lbls.length;
  let event = false;
  let opens = $state(Array(lbls.length).fill(false));
  let elems: HTMLDetailsElement[] = $state([]);

  // *** Initialize Deps *** //
  const svsDisclosure = {
    ...omit(deps?.svsDisclosure, "attributes", "style"),
    style: deps?.svsDisclosure?.style ?? `${preset} svs-disclosure`,
  };

  // *** Bind Handlers *** //
  $effect.pre(() => {
    current;
    untrack(() => toggle());
  });
  function toggle() {
    if (!event) opens = opens.fill(false).map((_, i) => i === current);
    event = false;
  }
  function setCurrent(index: number) {
    current = index;
    if (guard) return guard = false;
    event = true;
  }

  // *** Event Handlers *** //
  function exclusiveToggle(index: number): (ev: Event) => void {
    return (ev) => {
      deps?.svsDisclosure?.attributes?.ontoggle?.(ev as any);
      if (opens.every((x) => !x)) return setCurrent(-1);
      if (elems[index].open) {
        opens = opens.map((_, i) => i === index);
        setCurrent(index);
      }
    };
  }
</script>

<!---------------------------------------->

{#if isValidAccordion}
  <div class={cls(PARTS.WHOLE, status)} role="group">
    {#each lbls as { id, name }, i (id)}
      {@const ontoggle = exclusiveToggle(i)}
      <Disclosure bind:open={opens[i]} bind:element={elems[i]} label={isStrLabel ? name : (rest[name] as Snippet)} attributes={{...deps?.svsDisclosure?.attributes, ontoggle}} {...svsDisclosure}>
        {@render (rest[panels[i]] as Snippet)()}
      </Disclosure>
    {/each}
  </div>
{/if}
