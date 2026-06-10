<script module lang="ts">
  export interface DisclosureCtxProviderProps {
    current?: string;
    variant?: string;
    inactiveA?: string;
  }
</script>

<script lang="ts">
  import Disclosure, { setDisclosureContext, type DisclosureContext } from "#svs/_Disclosure.svelte";
  import { VARIANT } from "#svs/core";

  let { current = $bindable(), variant = VARIANT.NEUTRAL, inactiveA }: DisclosureCtxProviderProps = $props();

  const ctx: DisclosureContext = {
    get current() {
      return current;
    },
    set current(v: string | undefined) {
      current = v;
    },
    get variant() {
      return variant;
    },
    get styling() {
      return undefined;
    },
  };
  setDisclosureContext(ctx);
</script>

{#snippet panel(id: string, variant: string)}
  <div data-testid={`panel-${id}`} data-variant={variant}>Panel {id} - {variant}</div>
{/snippet}

{#snippet labelA(open: boolean, variant: string)}
  <span data-testid="label-a" data-open={open} data-variant={variant}>Section A</span>
{/snippet}

{#snippet labelB(open: boolean, variant: string)}
  <span data-testid="label-b" data-open={open} data-variant={variant}>Section B</span>
{/snippet}

{#snippet childrenA(variant: string)}
  {@render panel("a", variant)}
{/snippet}

{#snippet childrenB(variant: string)}
  {@render panel("b", variant)}
{/snippet}

<Disclosure id="a" label={labelA} children={childrenA} duration={0} inactive={inactiveA} variant="child-local" />
<Disclosure id="b" label={labelB} children={childrenB} duration={0} />
