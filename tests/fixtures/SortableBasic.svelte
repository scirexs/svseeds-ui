<script lang="ts">
  import Sortable from "#svs/Sortable.svelte";
  import { VARIANT } from "#svs/core";
  import type { Attachment } from "svelte/attachments";
  import type { SVSClass, SVSVariant } from "#svs/core";
  import type { SortableMode, SortableMessages } from "#svs/Sortable.svelte";

  interface Props {
    items?: string[];
    mode?: SortableMode;
    sort?: boolean;
    multiple?: boolean;
    confirm?: boolean;
    appendable?: boolean;
    draggable?: boolean;
    dragging?: boolean;
    messages?: Partial<SortableMessages>;
    ariaLabel?: string;
    ariaRoleDescription?: string;
    ariaLabelledby?: string;
    dataProbe?: string;
    listClass?: string;
    styling?: SVSClass;
    variant?: SVSVariant;
    noHandle?: boolean;
  }

  // prettier-ignore
  let { items = $bindable(["a", "b", "c"]), mode = "move", sort = true, multiple = false, confirm = false, appendable = false, draggable = true, dragging = $bindable(false), messages, ariaLabel, ariaRoleDescription, ariaLabelledby, dataProbe, listClass, styling, variant = VARIANT.NEUTRAL, noHandle = false }: Props = $props();
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
  {messages}
  {ariaLabel}
  {ariaRoleDescription}
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
