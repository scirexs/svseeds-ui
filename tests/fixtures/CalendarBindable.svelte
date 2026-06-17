<script module lang="ts">
  import Calendar, { type CalendarProps } from "#svs/_Calendar.svelte";

  interface Props extends Omit<CalendarProps, "value" | "display" | "picking"> {
    value?: Temporal.PlainDate;
    display?: Temporal.PlainYearMonth;
    picking?: boolean;
  }
</script>

<script lang="ts">
  // prettier-ignore
  let { value = $bindable(), display = $bindable(), picking = $bindable(false), ...rest }: Props = $props();
</script>

<Calendar bind:value bind:display bind:picking {...rest as any} />
<output data-testid="value">{value ? `${value.year}-${value.month}-${value.day}` : ""}</output>
<output data-testid="display">{display ? `${display.year}-${display.month}` : ""}</output>
<output data-testid="picking">{picking}</output>
