<script module lang="ts">
  import type { DateInputProps } from "#svs/DateInput.svelte";

  interface Props extends Omit<DateInputProps, "value" | "open"> {
    value?: Temporal.PlainDate;
    open?: boolean;
  }
</script>

<script lang="ts">
  import DateInput from "#svs/DateInput.svelte";

  // prettier-ignore
  let { value = $bindable(), open = $bindable(false), ...rest }: Props = $props();
</script>

<DateInput bind:value bind:open {...rest} />
<output data-testid="value">{value?.toString() ?? ""}</output>
<output data-testid="open">{open}</output>
