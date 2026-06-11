<script lang="ts">
  import Sortable from "#svs/_Sortable.svelte";
  import { createSortableGroup } from "#svs/_Sortable.svelte";
  import { type Attachment } from "svelte/attachments";
  import type { Card } from "./SortableObjects.svelte";

  interface Props {
    a?: Card[];
    b?: Card[];
  }

  let { a = $bindable([{ id: "a", text: "Alpha" }]), b = $bindable([{ id: "b", text: "Beta" }]) }: Props = $props();
  const group = createSortableGroup();
</script>

<Sortable group={group} id="a" bind:items={a} mode="clone" key={(card) => card.id} clone={(card) => ({ ...card, id: card.id + "*" })}>
  {#snippet item(card: Card, variant: string, handle: Attachment)}
    <span data-testid={"item-" + card.id} data-variant={variant} {@attach handle}>{card.id}</span>
  {/snippet}
</Sortable>
<Sortable group={group} id="b" bind:items={b} mode="clone" key={(card) => card.id} clone={(card) => ({ ...card, id: card.id + "*" })}>
  {#snippet item(card: Card, variant: string, handle: Attachment)}
    <span data-testid={"item-" + card.id} data-variant={variant} {@attach handle}>{card.id}</span>
  {/snippet}
</Sortable>
<output data-testid="readout-a">{a.map((card) => card.id).join(",")}</output>
<output data-testid="readout-b">{b.map((card) => card.id).join(",")}</output>
