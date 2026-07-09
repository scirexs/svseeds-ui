<script lang="ts">
  import Sortable, { type SortableMode } from "#svs/Sortable.svelte";
  import { type Attachment } from "svelte/attachments";
  import { VARIANT, type SVSClass, type SVSVariant } from "#svs/core";

  interface Props {
    items?: string[];
    mode?: SortableMode;
    sort?: boolean;
    multiple?: boolean;
    confirm?: boolean;
    appendable?: boolean;
    draggable?: boolean;
    dragging?: boolean;
    ariaLabel?: string;
    ariaLabelledby?: string;
    dataProbe?: string;
    listClass?: string;
    styling?: SVSClass;
    variant?: SVSVariant;
    noHandle?: boolean;
  }

  // prettier-ignore
  let { items = $bindable(["a", "b", "c"]), mode = "move", sort = true, multiple = false, confirm = false, appendable = false, draggable = true, dragging = $bindable(false), ariaLabel, ariaLabelledby, dataProbe, listClass, styling, variant = VARIANT.NEUTRAL, noHandle = false }: Props = $props();
</script>

<Sortable
  bind:items
  bind:dragging
  {mode}
  {sort}
  {multiple}
  {confirm}
  {appendable}
  {draggable}
  {ariaLabel}
  {styling}
  {variant}
  aria-labelledby={ariaLabelledby}
  data-probe={dataProbe}
  class={listClass}
>
  {#snippet item(value: string, variant: string, handle: Attachment)}
    {#if noHandle}
      <span data-testid={"item-" + value} data-variant={variant}>{value}</span>
    {:else}
      <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
    {/if}
  {/snippet}
</Sortable>
<output data-testid="value-readout">{items.join(",")}</output>
<output data-testid="dragging-readout">{dragging ? "true" : "false"}</output>
