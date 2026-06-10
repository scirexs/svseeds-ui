<script module lang="ts">
  export interface AccordionDeclarativeProps {
    items?: AccordionItem[];
    current?: string;
    variant?: string;
    inactiveB?: string | boolean;
  }

  import { type AccordionItem } from "#svs/Accordion.svelte";
</script>

<script lang="ts">
  import Accordion from "#svs/Accordion.svelte";
  import Disclosure from "#svs/_Disclosure.svelte";
  import { VARIANT } from "#svs/core";

  let { items, current = $bindable(), variant = VARIANT.NEUTRAL, inactiveB }: AccordionDeclarativeProps = $props();
</script>

{#snippet labelA(open: boolean, variant: string)}
  <span data-testid="label-a" data-open={open} data-variant={variant}>Section A</span>
{/snippet}

{#snippet labelB(open: boolean, variant: string)}
  <span data-testid="label-b" data-open={open} data-variant={variant}>Section B</span>
{/snippet}

{#snippet panelA(variant: string)}
  <div data-testid="panel-a" data-variant={variant}>Panel A - {variant}</div>
{/snippet}

{#snippet panelB(variant: string)}
  <div data-testid="panel-b" data-variant={variant}>Panel B - {variant}</div>
{/snippet}

<Accordion {items} bind:current {variant}>
  <Disclosure id="a" label={labelA} children={panelA} duration={0} />
  <Disclosure id="b" label={labelB} children={panelB} duration={0} inactive={inactiveB} />
</Accordion>
