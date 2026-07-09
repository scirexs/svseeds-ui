<script lang="ts">
  import ZSortableA11y, { createZSortableA11yGroup } from "#svs/ZSortableA11y.svelte";
  import { VARIANT } from "#svs/core";
  import type { SortableMode } from "#svs/ZSortableA11y.svelte";
  import type { Attachment } from "svelte/attachments";
  import type { SVSVariant } from "#svs/core";

  interface Props {
    a?: string[];
    b?: string[];
    c?: string[];
    mode?: SortableMode;
    acceptB?: string[] | ((fromId: string) => boolean);
    sortA?: boolean;
    sortB?: boolean;
    multiple?: boolean;
    variant?: SVSVariant;
  }

  // prettier-ignore
  let { a = $bindable(["a1", "a2"]), b = $bindable(["b1"]), c = $bindable([]), mode = "move", acceptB, sortA = true, sortB = true, multiple = false, variant = VARIANT.NEUTRAL }: Props = $props();
  const group = createZSortableA11yGroup();
</script>

<ZSortableA11y {group} id="a" bind:items={a} {mode} sort={sortA} {multiple} {variant} ariaLabel="Keyboard sortable A">
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
  {/snippet}
</ZSortableA11y>
<ZSortableA11y {group} id="b" bind:items={b} {mode} accept={acceptB} sort={sortB} {multiple} {variant} ariaLabel="Keyboard sortable B">
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
  {/snippet}
</ZSortableA11y>
<ZSortableA11y {group} id="c" bind:items={c} {mode} {multiple} {variant} ariaLabel="Keyboard sortable C">
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
  {/snippet}
</ZSortableA11y>
<output data-testid="readout-a">{a.join(",")}</output>
<output data-testid="readout-b">{b.join(",")}</output>
<output data-testid="readout-c">{c.join(",")}</output>
