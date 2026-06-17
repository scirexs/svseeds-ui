<script lang="ts">
  import Sortable from "#svs/Sortable.svelte";
  import { type Attachment } from "svelte/attachments";

  interface Props {
    items?: string[];
  }

  let { items = $bindable(["a", "b"]) }: Props = $props();
</script>

<Sortable bind:items>
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
  {/snippet}
  {#snippet ghost(value: string)}
    <div data-testid="ghost">{value}</div>
  {/snippet}
</Sortable>
<output data-testid="value-readout">{items.join(",")}</output>
