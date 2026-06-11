<script lang="ts">
  import SortableGroup from "#svs/SortableGroup.svelte";
  import Sortable, { type SortableGroupController } from "#svs/_Sortable.svelte";
  import { type Attachment } from "svelte/attachments";
  import { VARIANT, type SVSVariant } from "#svs/core";

  interface Props {
    group: SortableGroupController;
    a?: string[];
    b?: string[];
    variant?: SVSVariant;
  }

  let { group, a = $bindable(["a1"]), b = $bindable(["b1"]), variant = VARIANT.NEUTRAL }: Props = $props();
</script>

<SortableGroup {group} {variant}>
  <Sortable id="a" bind:items={a}>
    {#snippet item(value: string, variant: string, handle: Attachment)}
      <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
    {/snippet}
  </Sortable>
  <Sortable id="b" bind:items={b}>
    {#snippet item(value: string, variant: string, handle: Attachment)}
      <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
    {/snippet}
  </Sortable>
</SortableGroup>
<output data-testid="readout-a">{a.join(",")}</output>
<output data-testid="readout-b">{b.join(",")}</output>
