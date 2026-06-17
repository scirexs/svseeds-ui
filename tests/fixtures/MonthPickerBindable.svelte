<script module lang="ts">
  import MonthPicker, { type MonthPickerProps } from "#svs/_MonthPicker.svelte";

  interface Props extends Omit<MonthPickerProps, "value"> {
    value?: Temporal.PlainYearMonth;
  }
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), ...rest }: Props = $props();
</script>

<MonthPicker bind:value {...rest as any} />
<output data-testid="ym">{value ? `${value.year}-${value.month}` : ""}</output>
