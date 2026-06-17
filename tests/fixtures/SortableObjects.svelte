<script lang="ts">
  import Sortable, { type SortableMode } from "#svs/Sortable.svelte";
  import { type Attachment } from "svelte/attachments";

  export type Card = { id: string; text: string };

  interface Props {
    cards?: Card[];
    mode?: SortableMode;
  }

  let { cards = $bindable([{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }, { id: "c", text: "Gamma" }]), mode = "move" }: Props = $props();
</script>

<Sortable bind:items={cards} {mode} key={(card) => card.id} clone={(card) => ({ ...card, id: card.id + "*" })}>
  {#snippet item(card: Card, variant: string, handle: Attachment)}
    <span data-testid={"item-" + card.id} data-variant={variant} data-text={card.text} {@attach handle}>{card.id}:{card.text}</span>
  {/snippet}
</Sortable>
<output data-testid="value-readout">{cards.map((card) => card.id).join(",")}</output>
