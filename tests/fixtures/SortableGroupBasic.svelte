<script lang="ts">
  import SortableGroup from "#svs/SortableGroup.svelte";
  import Sortable from "#svs/Sortable.svelte";
  import { VARIANT } from "#svs/core";
  import type { Attachment } from "svelte/attachments";
  import type { EasingFunction } from "svelte/transition";
  import type { SVSClass, SVSVariant } from "#svs/core";
  import type { SortableMode, SortableMessages } from "#svs/Sortable.svelte";

  interface Props {
    a?: string[];
    b?: string[];
    mode?: SortableMode;
    acceptB?: string[] | ((fromId: string) => boolean);
    styling?: SVSClass;
    childStyling?: SVSClass;
    variant?: SVSVariant;
    childVariant?: SVSVariant;
    duration?: number;
    easing?: EasingFunction;
    messages?: Partial<SortableMessages>;
    ariaLabel?: string;
    ariaLabelledby?: string;
    dataProbe?: string;
    groupClass?: string;
  }

  // prettier-ignore
  let { a = $bindable(["a1", "a2"]), b = $bindable(["b1", "b2"]), mode = "move", acceptB, styling, childStyling, variant = VARIANT.NEUTRAL, childVariant = VARIANT.NEUTRAL, duration, easing, messages, ariaLabel, ariaLabelledby, dataProbe, groupClass }: Props = $props();
</script>

<SortableGroup
  {variant}
  {styling}
  {duration}
  {easing}
  {messages}
  aria-label={ariaLabel}
  aria-labelledby={ariaLabelledby}
  data-probe={dataProbe}
  class={groupClass}
>
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
