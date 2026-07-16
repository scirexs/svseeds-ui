<script lang="ts">
  import Sortable from "#svs/Sortable.svelte";
  import { type Attachment } from "svelte/attachments";

  interface Props {
    items?: string[];
    draggable?: boolean;
  }

  let { items = $bindable(["a", "b", "c"]), draggable = true }: Props = $props();
</script>

<Sortable bind:items {draggable}>
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"handle-" + value} data-variant={variant} {@attach handle}>handle</span>
    <span data-testid={"label-" + value}>{value}</span>
  {/snippet}
</Sortable>
<output data-testid="value-readout">{items.join(",")}</output>
