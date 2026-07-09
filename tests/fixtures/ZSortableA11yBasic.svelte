<script lang="ts">
  import ZSortableA11y, { type SortableMode } from "#svs/ZSortableA11y.svelte";
  import { type Attachment } from "svelte/attachments";
  import { VARIANT, type SVSVariant } from "#svs/core";

  interface Props {
    items?: string[];
    mode?: SortableMode;
    multiple?: boolean;
    sort?: boolean;
    variant?: SVSVariant;
  }

  // prettier-ignore
  let { items = $bindable(["a", "b", "c"]), mode = "move", multiple = false, sort = true, variant = VARIANT.NEUTRAL }: Props = $props();
</script>

<ZSortableA11y bind:items {mode} {multiple} {sort} {variant} ariaLabel="Keyboard sortable">
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
  {/snippet}
</ZSortableA11y>
<output data-testid="value-readout">{items.join(",")}</output>
