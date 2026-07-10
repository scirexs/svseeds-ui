<script lang="ts">
  import Sortable, { createSortableGroup, type SortableMode } from "#svs/Sortable.svelte";
  import { type Attachment } from "svelte/attachments";

  interface Props {
    a?: string[];
    b?: string[];
    c?: string[];
    mode?: SortableMode;
    acceptB?: string[] | ((fromId: string) => boolean);
    sortA?: boolean;
    sortB?: boolean;
    multiple?: boolean;
    appendableB?: boolean;
  }

  let {
    a = $bindable(["a1", "a2"]),
    b = $bindable(["b1", "b2"]),
    c = $bindable(["c1"]),
    mode = "move",
    acceptB,
    sortA = true,
    sortB = true,
    multiple = false,
    appendableB = false,
  }: Props = $props();
  const group = createSortableGroup();
</script>

<Sortable {group} id="a" bind:items={a} {mode} sort={sortA} {multiple}>
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
  {/snippet}
</Sortable>
<Sortable {group} id="b" bind:items={b} {mode} accept={acceptB} sort={sortB} appendable={appendableB}>
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
  {/snippet}
</Sortable>
<Sortable {group} id="c" bind:items={c} {mode}>
  {#snippet item(value: string, variant: string, handle: Attachment)}
    <span data-testid={"item-" + value} data-variant={variant} {@attach handle}>{value}</span>
  {/snippet}
</Sortable>
<output data-testid="readout-a">{a.join(",")}</output>
<output data-testid="readout-b">{b.join(",")}</output>
<output data-testid="readout-c">{c.join(",")}</output>
