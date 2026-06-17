<script lang="ts">
  import SortableGroup from "#svs/SortableGroup.svelte";
  import Sortable, { type SortableMode } from "#svs/Sortable.svelte";
  import { type Attachment } from "svelte/attachments";
  import { VARIANT, type SVSClass, type SVSVariant } from "#svs/core";

  interface Props {
    a?: string[];
    b?: string[];
    mode?: SortableMode;
    acceptB?: string[] | ((fromId: string) => boolean);
    styling?: SVSClass;
    childStyling?: SVSClass;
    variant?: SVSVariant;
    childVariant?: SVSVariant;
  }

  // prettier-ignore
  let { a = $bindable(["a1", "a2"]), b = $bindable(["b1", "b2"]), mode = "move", acceptB, styling, childStyling, variant = VARIANT.NEUTRAL, childVariant = VARIANT.NEUTRAL }: Props = $props();
</script>

<SortableGroup {variant} {styling}>
  <Sortable id="a" bind:items={a} {mode} styling={childStyling} variant={childVariant}>
    {#snippet item(value: string, variant: string, handle: Attachment)}
      <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
    {/snippet}
  </Sortable>
  <Sortable id="b" bind:items={b} {mode} accept={acceptB}>
    {#snippet item(value: string, variant: string, handle: Attachment)}
      <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
    {/snippet}
  </Sortable>
</SortableGroup>
<output data-testid="readout-a">{a.join(",")}</output>
<output data-testid="readout-b">{b.join(",")}</output>
